import { createStore } from 'zustand/vanilla';
import type { Disk } from '../data/disk';
import type { Store } from '../data/store';
import { fingerprint, isEmpty, makeBackup, readBackup, type Backup } from './backup';
import { AccountError, problemOf, type AccountProblem, type Cloud, type Google, type GoogleUser, type SavedFile } from './types';

/** Why the person is asked what to keep. */
export type Why =
  /** The phone and Drive both have data, and they differ. */
  | 'differs'
  /** What is in Drive can't be read. */
  | 'unreadable'
  /** The data on this phone was saved to another account. */
  | 'someoneElses';

/** A question only the person can answer. */
export interface Choice {
  why: Why;
  /** What is in Drive, if it can be read, and if it is there. */
  saved: Backup | null;
  file: SavedFile | null;
  /** Found while signing in, not during a later save. */
  signingIn: boolean;
}

export type Busy = 'signingIn' | 'saving' | 'leaving' | 'deleting';

/** What is remembered between launches. */
interface Session {
  user: GoogleUser | null;
  /** Marks the saves made by this phone. */
  device: string;
  savedAt: number | null;
  /** Fingerprint of the data as last saved. */
  print: string;
  /** The saved file as this phone last saw it. */
  version: string;
  /** After logging out but keeping the data here: a mark of whose it was. Not the address itself. */
  keptFrom: string;
}

export interface AccountState extends Session {
  busy: Busy | null;
  problem: AccountProblem | null;
  choice: Choice | null;
}

const NOBODY: Session = { user: null, device: '', savedAt: null, print: '', version: '', keptFrom: '' };

/** These wait for the person: nothing is tried by itself meanwhile. */
const WAITING: readonly (AccountProblem | null)[] = ['conflict', 'unreadable', 'gone'];
const QUIET = 4000;

export type Keep = 'saved' | 'phone' | 'neither';

/**
 * Signing in with Google saves everything to the person's own Drive, and brings it back when they sign in again. Without
 * an account nothing leaves the phone. Two phones are not kept in step: if another phone saved in between, Peppercorn
 * asks which data to keep instead of writing over it.
 */
export class Account {
  readonly state = createStore<AccountState>(() => ({ ...NOBODY, busy: null, problem: null, choice: null }));
  /** One thing at a time: a save never overlaps another, or logging out. */
  private turn: Promise<unknown> = Promise.resolve();
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly store: Store,
    private readonly google: Google,
    private readonly cloud: Cloud,
    private readonly disk: Disk,
    private readonly now: () => number,
    private readonly newId: () => string,
    private readonly onRestored: () => void = () => {},
  ) {}

  private get s(): AccountState {
    return this.state.getState();
  }

  private patch(p: Partial<AccountState>) {
    this.state.setState(p);
  }

  private inTurn<T>(work: () => Promise<T>): Promise<T> {
    const run = this.turn.then(work, work);
    this.turn = run.catch(() => undefined);
    return run;
  }

  // MARK: Remembering

  /** Reads who is signed in. */
  async open(): Promise<void> {
    try {
      const text = await this.disk.read();
      if (text) this.patch({ ...NOBODY, ...(JSON.parse(text) as Partial<Session>) });
    } catch {
      // Signed out, then: signing in again sorts it out.
    }
  }

  private async remember(session: Partial<Session>): Promise<void> {
    this.patch(session);
    const { user, device, savedAt, print, version, keptFrom } = this.s;
    try {
      await this.disk.write(JSON.stringify({ user, device, savedAt, print, version, keptFrom }));
    } catch {
      // Remembered until the app closes.
    }
  }

  /** Forgets the account. `keptFrom` stays, or becomes whose data is left here. */
  private async forget(keptFrom = this.s.keptFrom): Promise<void> {
    this.patch({ problem: null, choice: null });
    await this.remember({ ...NOBODY, keptFrom });
  }

  private mark = (user: GoogleUser) => fingerprint(user.id.toLowerCase());

  private markIfKept(user: GoogleUser | null): string {
    return user && !isEmpty(this.store.snapshot()) ? this.mark(user) : '';
  }

  // MARK: Writing

  private async write(to: SavedFile | null): Promise<void> {
    const data = this.store.snapshot();
    // Drive must never know of data this phone could still lose: after a restart the older data here would look like the
    // newer, and be saved over it.
    if (!(await this.store.flush())) throw new AccountError('storage');
    const backup = makeBackup(data, this.s.device, this.now());
    const written = await this.cloud.write(to, JSON.stringify(backup));
    await this.remember({ savedAt: backup.savedAt, print: fingerprint(data), version: written.modifiedTime });
    this.patch({ problem: null });
  }

  private async putBack(saved: Backup, from: SavedFile): Promise<void> {
    if (!(await this.store.restore(saved.data))) throw new AccountError('storage');
    await this.remember({ savedAt: saved.savedAt, print: fingerprint(this.store.snapshot()), version: from.modifiedTime });
    this.patch({ problem: null });
    this.onRestored();
  }

  /** What is saved, or null if it can't be read. Other problems are thrown. */
  private async readable(found: SavedFile): Promise<Backup | null> {
    try {
      return readBackup(await this.cloud.read(found));
    } catch (error) {
      if (problemOf(error) === 'unreadable') return null;
      throw error;
    }
  }

  /** Into the app, with the Google name if there isn't one yet. */
  private enter(user: GoogleUser | null) {
    this.store.set({ welcomed: true, name: this.store.data.settings.name || (user?.name ?? '') });
  }

  // MARK: Signing in

  /** Saved data comes back by itself on an empty phone; otherwise the person chooses. Null when all went well. */
  async signIn(): Promise<AccountProblem | null> {
    await this.turn;
    if (this.s.busy) return null;
    this.patch({ busy: 'signingIn' });
    try {
      // Google's screens can stay open for as long as they like: saving goes on meanwhile.
      const user = await this.google.signIn();
      return await this.inTurn(() => this.signedIn(user));
    } catch (error) {
      return problemOf(error);
    } finally {
      if (this.s.busy === 'signingIn') this.patch({ busy: null });
    }
  }

  private async signedIn(user: GoogleUser): Promise<AccountProblem | null> {
    const before = this.s.user;
    // Signing in again after the session ended: this phone's data already belongs to someone.
    if (before && this.store.data.settings.welcomed) {
      if (before.id !== user.id) {
        await this.google.signOut();
        return 'wrongAccount';
      }
      this.patch({ busy: null, problem: null });
      await this.saveNow(true);
      return null;
    }
    try {
      await this.begin(user);
      return null;
    } catch (error) {
      await this.forget();
      await this.google.signOut();
      return problemOf(error);
    }
  }

  private async begin(user: GoogleUser): Promise<void> {
    const found = await this.cloud.find();
    const saved = found ? await this.readable(found) : null;
    const here = this.store.snapshot();
    const { keptFrom } = this.s;
    // Only for now: closing the app before the question is answered is the same as not signing in.
    this.patch({ ...NOBODY, user, device: this.newId(), keptFrom });
    const ask = (why: Why) => this.patch({ choice: { why, saved, file: found, signingIn: true } });
    if (found) {
      if (!saved) return ask('unreadable');
      if (!isEmpty(here) && fingerprint(saved.data) !== fingerprint(here)) return ask('differs');
      await this.putBack(saved, found);
    } else if (!isEmpty(here) && keptFrom && keptFrom !== this.mark(user)) return ask('someoneElses');
    this.enter(user);
    if (found) return;
    try {
      await this.write(null);
    } catch (error) {
      // A first save that fails is tried again later; the person is signed in either way.
      await this.remember({});
      this.patch({ problem: problemOf(error) });
    }
  }

  /** Answers which data to keep. The other is replaced. */
  choose(keep: Keep): Promise<AccountProblem | null> {
    return this.inTurn(async () => {
      const { choice, user } = this.s;
      if (!choice) return null;
      if (keep === 'neither') {
        if (choice.signingIn) {
          await this.forget();
          await this.google.signOut();
        } else this.patch({ choice: null });
        return null;
      }
      this.patch({ busy: 'saving' });
      try {
        if (keep === 'phone') await this.write(choice.file);
        else if (choice.saved && choice.file) await this.putBack(choice.saved, choice.file);
        else return null;
      } catch (error) {
        return problemOf(error);
      } finally {
        this.patch({ busy: null });
      }
      this.patch({ choice: null });
      this.enter(user);
      return null;
    });
  }

  // MARK: Saving

  /** Saves if anything changed. `check` also makes sure the saved file is really there. True when all is saved. */
  save(check = false): Promise<boolean> {
    return this.inTurn(() => this.saveNow(check));
  }

  private async saveNow(check: boolean): Promise<boolean> {
    const { user, choice, print: last, version, device, busy } = this.s;
    // Before the welcome screen is passed, what's here isn't this person's data.
    if (!user || choice || this.store.state.getState().status !== 'ready' || !this.store.data.settings.welcomed) return false;
    const print = fingerprint(this.store.snapshot());
    if (print === last && !check) return true;
    // Logging out and signing in say so themselves.
    const mine = busy === null;
    if (mine) this.patch({ busy: 'saving' });
    try {
      const found = await this.cloud.find();
      if (found && found.modifiedTime !== version) {
        const saved = await this.readable(found);
        if (!saved) return this.wait('unreadable', { why: 'unreadable', saved: null, file: found, signingIn: false });
        if (saved.device !== device && fingerprint(saved.data) !== print) return this.wait('conflict', { why: 'differs', saved, file: found, signingIn: false });
      }
      // Deleted from another phone: it comes back only if the person asks for that here.
      if (!found && version && !check) return this.wait('gone', null);
      if (found && found.modifiedTime === version && print === last) this.patch({ problem: null });
      else await this.write(found);
      return true;
    } catch (error) {
      this.patch({ problem: problemOf(error) });
      return false;
    } finally {
      if (mine) this.patch({ busy: null });
    }
  }

  private wait(problem: AccountProblem, choice: Choice | null): false {
    this.patch({ problem, choice });
    return false;
  }

  /** Saves a few seconds after the last change. Returns how to stop. */
  start(): () => void {
    let last = this.store.data;
    const stop = this.store.state.subscribe(({ data }) => {
      // Prices come and go without anything worth saving having changed.
      const same = data.entries === last.entries && data.categories === last.categories && data.budgets === last.budgets && data.owned === last.owned && data.settings === last.settings;
      last = data;
      if (same) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.saveSoon(), QUIET);
    });
    return () => {
      clearTimeout(this.timer);
      stop();
    };
  }

  /** Also called when the app is opened or left. */
  saveSoon() {
    const { user, keptFrom, problem } = this.s;
    // What someone left here is gone now.
    if (!user && keptFrom && this.store.state.getState().status === 'ready' && isEmpty(this.store.snapshot())) void this.forget('');
    // What to do is the person's answer: it isn't asked again by itself.
    if (user && !WAITING.includes(problem)) void this.save();
  }

  // MARK: Leaving

  /** Saves one last time, then removes everything from this phone. If it can't save, nothing is removed. */
  logOut(): Promise<boolean> {
    return this.inTurn(async () => {
      if (this.s.busy) return false;
      this.patch({ busy: 'leaving' });
      try {
        if (!(await this.saveNow(true)) || fingerprint(this.store.snapshot()) !== this.s.print) return false;
        // First the account, so the emptied phone is never saved.
        await this.forget('');
        this.store.reset();
        await this.google.signOut();
        return true;
      } finally {
        this.patch({ busy: null });
      }
    });
  }

  /** Stops saving and keeps this phone's data, for when the last save isn't possible. */
  logOutKeepingData(): Promise<void> {
    return this.inTurn(async () => {
      await this.forget(this.markIfKept(this.s.user));
      this.store.set({ welcomed: false });
      await this.google.signOut();
    });
  }

  /** Without an account after all: forgets a sign-in left over on this phone. */
  continueWithout(): Promise<void> {
    return this.inTurn(async () => {
      if (!this.s.user) return;
      await this.forget();
      await this.google.signOut();
    });
  }

  /** Deletes what is saved in Drive and ends Peppercorn's access. This phone's data stays. */
  deleteSaved(): Promise<AccountProblem | null> {
    return this.inTurn(async () => {
      const { user } = this.s;
      if (!user) return null;
      this.patch({ busy: 'deleting' });
      try {
        await this.cloud.remove();
        await this.forget(this.markIfKept(user));
        await this.google.revoke(user.email);
        return null;
      } catch (error) {
        return problemOf(error);
      } finally {
        this.patch({ busy: null });
      }
    });
  }
}
