import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { fingerprint, isEmpty, makeBackup, readBackup, snapshot, type Backup } from './backup';
import { deleteSaved, findSaved, readSaved, writeSaved, type SavedFile } from './drive';
import { AccountError, googleRevoke, googleSignIn, googleSignOut, type AccountProblem, type GoogleUser } from './googleSignIn';
import { refreshPrices } from './prices';
import { newId, useStore } from './store';

/*
 * Signing in with Google saves everything to the person's own Drive, and brings it back when they sign in again.
 * Without an account nothing leaves the phone. Two phones are not kept in step: if another phone saved in between,
 * Peppercorn asks which data to keep instead of writing over it.
 */

interface Choice {
  saved: Backup;
  file: SavedFile;
  /** Found while signing in, rather than during a later save. */
  signingIn: boolean;
}

interface Account {
  user: GoogleUser | null;
  /** Marks the saves made by this phone. */
  device: string;
  savedAt: number | null;
  /** Fingerprint of the data as last saved. */
  savedPrint: string;
  /** The saved file as this phone last saw it. */
  savedVersion: string;

  busy: 'signingIn' | 'saving' | 'leaving' | 'deleting' | null;
  problem: AccountProblem | null;
  choice: Choice | null;
}

const NOBODY: Account = { user: null, device: '', savedAt: null, savedPrint: '', savedVersion: '', busy: null, problem: null, choice: null };

export const useAccount = create<Account>()(
  persist((): Account => NOBODY, {
    name: 'peppercorn-account',
    version: 1,
    storage: createJSONStorage(() => AsyncStorage),
    partialize: ({ user, device, savedAt, savedPrint, savedVersion }) => ({ user, device, savedAt, savedPrint, savedVersion }),
  }),
);

const { getState: get, setState: set } = useAccount;
const problemOf = (error: unknown): AccountProblem => (error instanceof AccountError ? error.problem : 'failed');

async function write(file: SavedFile | null) {
  const data = snapshot();
  const backup = makeBackup(data, get().device);
  const written = await writeSaved(file, JSON.stringify(backup));
  set({ savedAt: backup.savedAt, savedPrint: fingerprint(data), savedVersion: written.modifiedTime, problem: null });
}

function putBack(saved: Backup, file: SavedFile) {
  useStore.getState().restore(saved.data);
  set({ savedAt: saved.savedAt, savedPrint: fingerprint(saved.data), savedVersion: file.modifiedTime, problem: null });
  void refreshPrices();
}

/** Into the app, with the Google name if there isn't one yet. */
function enter() {
  const { settings, updateSettings } = useStore.getState();
  updateSettings({ welcomed: true, profileName: settings.profileName || (get().user?.name ?? '') });
}

// MARK: Signing in

/** Signs in. Saved data comes back by itself on an empty phone; otherwise the person chooses. */
export async function signIn(): Promise<AccountProblem | null> {
  await running;
  if (get().busy) return null;
  const before = get().user;
  set({ busy: 'signingIn' });
  try {
    const user = await googleSignIn();
    // Signing in again after the session ended: this phone's data already belongs to someone.
    if (before) {
      if (before.id !== user.id) {
        await googleSignOut();
        throw new AccountError('wrongAccount');
      }
      set({ busy: null, problem: null });
      await save(true);
      return null;
    }
    try {
      const file = await findSaved();
      const saved = file ? readBackup(await readSaved(file)) : null;
      const here = snapshot();
      set({ ...NOBODY, busy: 'signingIn', user, device: newId() });
      if (file && saved) {
        if (isEmpty(here) || fingerprint(saved.data) === fingerprint(here)) putBack(saved, file);
        else {
          set({ choice: { saved, file, signingIn: true } });
          return null;
        }
      }
      enter();
      // A first save that fails is tried again later; the person is signed in either way.
      if (!file) await write(null).catch((error) => set({ problem: problemOf(error) }));
      return null;
    } catch (error) {
      await googleSignOut();
      set(NOBODY);
      throw error;
    }
  } catch (error) {
    return problemOf(error);
  } finally {
    if (get().busy === 'signingIn') set({ busy: null });
  }
}

/** Answers which data to keep. The other is replaced. */
export async function choose(keep: 'saved' | 'phone' | 'neither'): Promise<AccountProblem | null> {
  const { choice } = get();
  if (!choice || get().busy) return null;
  if (keep === 'neither') {
    if (choice.signingIn) {
      set(NOBODY);
      await googleSignOut();
    } else set({ choice: null, problem: 'conflict' });
    return null;
  }
  if (keep === 'saved') {
    putBack(choice.saved, choice.file);
    set({ choice: null });
  } else {
    set({ busy: 'saving' });
    try {
      await write(choice.file);
      set({ choice: null });
    } catch (error) {
      return problemOf(error);
    } finally {
      set({ busy: null });
    }
  }
  enter();
  return null;
}

// MARK: Saving

let running: Promise<boolean> | null = null;

/** Saves if anything changed. `check` also makes sure the saved file is really there. True when all is saved. */
export function save(check = false): Promise<boolean> {
  if (running) return running.then(() => save(check));
  running = saveOnce(check).finally(() => {
    running = null;
  });
  return running;
}

async function saveOnce(check: boolean): Promise<boolean> {
  const { user, choice, savedPrint, busy } = get();
  // Before the welcome screen is passed, what's on the phone isn't this person's data.
  if (!user || choice || busy === 'signingIn' || busy === 'deleting' || !useStore.getState().settings.welcomed) return false;
  const print = fingerprint(snapshot());
  if (print === savedPrint && !check) return true;
  const leaving = busy === 'leaving';
  if (!leaving) set({ busy: 'saving' });
  try {
    const file = await findSaved();
    if (file && file.modifiedTime !== get().savedVersion) {
      const saved = readBackup(await readSaved(file));
      if (saved.device !== get().device && fingerprint(saved.data) !== print) {
        set({ choice: { saved, file, signingIn: false }, problem: 'conflict' });
        return false;
      }
    }
    if (file && file.modifiedTime === get().savedVersion && print === get().savedPrint) set({ problem: null });
    else await write(file);
    return true;
  } catch (error) {
    set({ problem: problemOf(error) });
    return false;
  } finally {
    if (!leaving) set({ busy: null });
  }
}

const QUIET = 4000;

/** Saves a few seconds after the last change, and when the app is left or opened. */
export function startSaving(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const now = () => {
    clearTimeout(timer);
    // Which data to keep is the person's answer: it isn't asked again by itself.
    if (get().user && get().problem !== 'conflict') void save();
  };
  const stop = useStore.subscribe(() => {
    if (!get().user) return;
    clearTimeout(timer);
    timer = setTimeout(now, QUIET);
  });
  const sub = AppState.addEventListener('change', now);
  const loaded = useAccount.persist.onFinishHydration(now);
  if (useAccount.persist.hasHydrated()) now();
  return () => {
    clearTimeout(timer);
    stop();
    loaded();
    sub.remove();
  };
}

// MARK: Leaving

/** Saves one last time, then removes everything from this phone. If it can't save, nothing is removed. */
export async function logOut(): Promise<boolean> {
  await running;
  if (get().busy) return false;
  set({ busy: 'leaving' });
  try {
    if (!(await save(true)) || fingerprint(snapshot()) !== get().savedPrint) return false;
    // First the account, so the emptied phone is never saved.
    set(NOBODY);
    useStore.getState().reset();
    await googleSignOut();
    return true;
  } finally {
    if (get().busy === 'leaving') set({ busy: null });
  }
}

/** Stops saving and keeps this phone's data, for when the last save isn't possible. */
export async function logOutKeepingData() {
  set(NOBODY);
  useStore.getState().updateSettings({ welcomed: false });
  await googleSignOut();
}

/** Without an account after all: forgets a sign-in left over on this phone. */
export async function continueWithoutAccount() {
  if (get().user) {
    set(NOBODY);
    await googleSignOut();
  }
}

/** Deletes what is saved in Drive and ends Peppercorn's access. This phone's data stays. */
export async function deleteAccountData(): Promise<AccountProblem | null> {
  await running;
  const { user, busy } = get();
  if (!user || busy) return null;
  set({ busy: 'deleting' });
  try {
    await deleteSaved();
    set(NOBODY);
    await googleRevoke(user.email);
    return null;
  } catch (error) {
    return problemOf(error);
  } finally {
    if (get().busy === 'deleting') set({ busy: null });
  }
}
