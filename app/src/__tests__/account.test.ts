import { Account, type Keep } from '@/account/account';
import { makeBackup, readBackup } from '@/account/backup';
import { AccountError, type AccountProblem, type Cloud, type Google, type GoogleUser, type SavedFile } from '@/account/types';
import type { Store } from '@/data/store';
import type { AppData, Saved } from '@/domain/model';
import { writeData } from '@/domain/saved';
import { entry, FakeDisk, ids, openStore, sample } from './fakes';

class FakeGoogle implements Google {
  user: GoogleUser = { id: '1', email: 'sara@example.com', name: 'Sara' };
  fails: AccountProblem | null = null;
  signedIn = false;
  gate: Promise<void> | null = null;
  async signIn() {
    if (this.fails) throw new AccountError(this.fails);
    await this.gate;
    this.signedIn = true;
    return this.user;
  }
  token = async () => 't';
  dropToken = async () => {};
  signOut = async () => void (this.signedIn = false);
  revoke = async () => void (this.signedIn = false);
}

class FakeCloud implements Cloud {
  text: string | null = null;
  version = 0;
  fails: AccountProblem | null = null;
  private check() {
    if (this.fails) throw new AccountError(this.fails);
  }
  async find(): Promise<SavedFile | null> {
    this.check();
    return this.text === null ? null : { id: 'f', modifiedTime: `v${this.version}` };
  }
  async read() {
    this.check();
    return this.text ?? '';
  }
  async write(_: SavedFile | null, text: string) {
    this.check();
    this.text = text;
    return { id: 'f', modifiedTime: `v${++this.version}` };
  }
  async remove() {
    this.check();
    this.text = null;
  }
  put(data: Saved) {
    this.text = JSON.stringify(makeBackup(data, 'other', 5));
    this.version++;
  }
  get notes() {
    return readBackup(this.text ?? '').data.entries.map((e) => e.note);
  }
}

const saved = (...notes: string[]): AppData => ({
  ...sample,
  entries: notes.map((n, i) => entry(String(i), 1, 1, { note: n, categoryId: 'food' })),
  budgets: [],
  owned: [],
  prices: {},
  settings: { ...sample.settings, welcomed: false },
});
const backup = (...notes: string[]): Saved => {
  const { categories, entries, budgets, owned, settings } = saved(...notes);
  return { categories, entries, budgets, owned, settings };
};

interface Rig {
  store: Store;
  phone: FakeDisk;
  remembered: FakeDisk;
  google: FakeGoogle;
  cloud: FakeCloud;
  account: Account;
}

async function rig(notes: string[] = [], parts: Partial<Pick<Rig, 'google' | 'cloud' | 'remembered' | 'phone'>> = {}): Promise<Rig> {
  const { store, disk: phone } = await openStore(saved(...notes), undefined, parts.phone);
  const google = parts.google ?? new FakeGoogle();
  const cloud = parts.cloud ?? new FakeCloud();
  const remembered = parts.remembered ?? new FakeDisk();
  const account = new Account({ store, google, cloud, disk: remembered, now: () => 7, newId: ids() });
  await account.open();
  return { store, phone, remembered, google, cloud, account };
}

const state = (r: Pick<Rig, 'account'>) => r.account.state.getState();
const notesOf = (r: Pick<Rig, 'store'>) => r.store.data.entries.map((e) => e.note);
let more = 0;
const add = (r: Rig, note: string) => r.store.putBack(entry(`more${more++}`, 1, 2, { note, categoryId: 'food' }));
const erase = (r: Rig) => r.store.erase();

// A store's own writes must not land in the middle of a test.
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('a first sign-in saves what is here', async () => {
  const r = await rig(['a']);
  expect(await r.account.signIn()).toBeNull();
  expect(r.store.data.settings.welcomed).toBe(true);
  expect(r.store.data.settings.name).toBe('Sara');
  expect(r.cloud.notes).toEqual(['a']);
  expect(state(r)).toMatchObject({ user: { name: 'Sara' }, busy: null });
});

test('saved data comes back on an empty phone', async () => {
  const r = await rig();
  r.cloud.put(backup('a', 'b'));
  expect(await r.account.signIn()).toBeNull();
  expect(notesOf(r)).toEqual(['a', 'b']);
});

test('log out, then back in', async () => {
  const r = await rig(['a']);
  await r.account.signIn();
  add(r, 'b');
  expect(await r.account.logOut()).toBe(true);
  expect(notesOf(r)).toEqual([]);
  expect(state(r).user).toBeNull();
  expect(r.google.signedIn).toBe(false);
  await r.account.signIn();
  expect(notesOf(r)).toEqual(['a', 'b']);
});

test('logging out never loses what couldn’t be saved', async () => {
  const r = await rig(['a']);
  await r.account.signIn();
  add(r, 'b');
  r.cloud.fails = 'offline';
  expect(await r.account.logOut()).toBe(false);
  expect(notesOf(r)).toEqual(['a', 'b']);
  expect(state(r).problem).toBe('offline');
  await r.account.logOutKeepingData();
  expect(notesOf(r)).toEqual(['a', 'b']);
  expect(r.store.data.settings.welcomed).toBe(false);
});

test.each<[Keep, string[], string[]]>([
  ['saved', ['there', 'there too'], ['there', 'there too']],
  ['phone', ['here'], ['here']],
  ['neither', ['here'], ['there', 'there too']],
])('different data asks, and "%s" does what it says', async (keep, here, there) => {
  const r = await rig(['here']);
  r.cloud.put(backup('there', 'there too'));
  await r.account.signIn();
  expect(state(r).choice).not.toBeNull();
  expect(await r.account.save()).toBe(false);
  expect(await r.account.choose(keep)).toBeNull();
  expect(state(r).choice).toBeNull();
  expect(notesOf(r)).toEqual(here);
  expect(r.cloud.notes).toEqual(there);
  expect(state(r).user === null).toBe(keep === 'neither');
});

test('another phone’s save is not written over', async () => {
  const r = await rig(['a']);
  await r.account.signIn();
  r.cloud.put(backup('theirs', 'theirs'));
  add(r, 'mine');
  expect(await r.account.save()).toBe(false);
  expect(state(r).problem).toBe('conflict');
  expect(r.cloud.notes[0]).toBe('theirs');
  await r.account.choose('neither');
  expect(state(r).user).not.toBeNull();
  await r.account.save();
  await r.account.choose('phone');
  expect(r.cloud.notes[1]).toBe('mine');
});

test('unchanged data isn’t saved again', async () => {
  const r = await rig(['a']);
  await r.account.signIn();
  expect(await r.account.save()).toBe(true);
  expect(r.cloud.version).toBe(1);
  expect(await r.account.save(true)).toBe(true);
  expect(r.cloud.version).toBe(1);
  r.cloud.text = null;
  expect(await r.account.save(true)).toBe(true);
  expect(r.cloud.text).not.toBeNull();
});

test('signing in again must be the same person', async () => {
  const r = await rig(['a']);
  await r.account.signIn();
  r.google.user = { id: '2', email: 'x@example.com', name: 'X' };
  expect(await r.account.signIn()).toBe('wrongAccount');
  expect(state(r).user?.id).toBe('1');
});

test('a failed sign-in leaves nothing behind', async () => {
  const r = await rig(['a']);
  r.cloud.fails = 'offline';
  expect(await r.account.signIn()).toBe('offline');
  expect(state(r)).toMatchObject({ user: null, busy: null });
  expect(r.store.data.settings.welcomed).toBe(false);
  r.cloud.fails = null;
  r.google.fails = 'cancelled';
  expect(await r.account.signIn()).toBe('cancelled');
  r.google.fails = null;
  r.cloud.text = '{"app":"peppercorn","version":9}';
  expect(await r.account.signIn()).toBe('newerVersion');
  expect(state(r).user).toBeNull();
  expect(notesOf(r)).toEqual(['a']);
});

test('deleting what is saved keeps the phone’s', async () => {
  const r = await rig(['a']);
  await r.account.signIn();
  expect(await r.account.deleteSaved()).toBeNull();
  expect(r.cloud.text).toBeNull();
  expect(notesOf(r)).toEqual(['a']);
  expect(state(r)).toMatchObject({ user: null, busy: null });
});

test.each([true, false])('a full phone never costs the backup (while signing in: %s)', async (signingIn) => {
  const r = await rig();
  r.cloud.put(backup('a', 'b', 'c'));
  if (signingIn) {
    r.phone.full = true;
    expect(await r.account.signIn()).toBe('storage');
    expect(state(r).user).toBeNull();
  } else {
    expect(await r.account.signIn()).toBeNull();
    r.phone.full = true;
    add(r, 'd');
    expect(await r.account.save()).toBe(false);
    expect(state(r).problem).toBe('storage');
  }
  // Opened again, with only what was written.
  const again = await rig([], { phone: new FakeDisk(r.phone.text), cloud: r.cloud, remembered: r.remembered });
  await again.account.save();
  expect(r.cloud.notes).toHaveLength(3);
});

test('choosing the saved data on a full phone changes nothing', async () => {
  const r = await rig(['here']);
  r.cloud.put(backup('there', 'there too'));
  await r.account.signIn();
  r.phone.full = true;
  expect(await r.account.choose('saved')).toBe('storage');
  expect(state(r).choice).not.toBeNull();
  expect(notesOf(r)).toEqual(['here']);
  r.phone.full = false;
  expect(await r.account.choose('saved')).toBeNull();
  expect(notesOf(r)).toHaveLength(2);
});

test('closed during the question, signing in again asks it again', async () => {
  const first = await rig(['here']);
  first.cloud.put(backup('there', 'there too'));
  await first.account.signIn();
  const again = await rig(['here'], { cloud: first.cloud, remembered: first.remembered });
  expect(state(again).user).toBeNull();
  expect(await again.account.signIn()).toBeNull();
  expect(state(again).choice?.why).toBe('differs');
  expect(await again.account.choose('saved')).toBeNull();
  expect(notesOf(again)).toHaveLength(2);
  expect(again.store.data.settings.welcomed).toBe(true);
});

test.each(['{broken', '{}', '{"app":"peppercorn","version":2,"data":{"categories":[]}}'])('a damaged backup (%s) can be replaced, or left alone', async (text) => {
  const r = await rig(['here']);
  r.cloud.text = text;
  expect(await r.account.signIn()).toBeNull();
  expect(state(r).choice?.why).toBe('unreadable');
  expect(await r.account.choose('neither')).toBeNull();
  expect(r.cloud.text).toBe(text);
  expect(state(r).user).toBeNull();
  await r.account.signIn();
  // There is nothing in Drive to keep.
  expect(await r.account.choose('saved')).toBeNull();
  expect(r.cloud.text).toBe(text);
  expect(await r.account.choose('phone')).toBeNull();
  expect(r.cloud.notes).toEqual(['here']);
  expect(r.store.data.settings.welcomed).toBe(true);
});

test('a backup damaged later is asked about', async () => {
  const r = await rig(['here']);
  await r.account.signIn();
  r.cloud.text = '{broken';
  r.cloud.version++;
  add(r, 'more');
  expect(await r.account.save()).toBe(false);
  expect(state(r).problem).toBe('unreadable');
  await r.account.choose('neither');
  expect(r.cloud.text).toBe('{broken');
  await r.account.save();
  await r.account.choose('phone');
  expect(state(r).problem).toBeNull();
  expect(r.cloud.notes).toHaveLength(2);
});

test('data kept after logging out isn’t saved to someone else without asking', async () => {
  const first = await rig(['mine', 'mine too']);
  await first.account.signIn();
  await first.account.logOutKeepingData();
  expect(first.remembered.text).not.toContain('sara');

  first.google.user = { id: '2', email: 'x@example.com', name: 'X' };
  const theirs = new FakeCloud();
  const account = new Account({ store: first.store, google: first.google, cloud: theirs, disk: first.remembered, now: () => 7, newId: ids() });
  await account.open();
  const now = () => account.state.getState();
  expect(now().user).toBeNull();
  // Closing the app at the question is no answer.
  await account.signIn();
  const later = new Account({ store: first.store, google: first.google, cloud: theirs, disk: first.remembered, now: () => 7, newId: ids() });
  await later.open();
  expect(later.state.getState().user).toBeNull();
  await later.save();
  expect(theirs.text).toBeNull();
  await account.choose('neither');
  // Cancelling changes nothing, and it is asked again.
  for (let i = 0; i < 2; i++) {
    expect(await account.signIn()).toBeNull();
    expect(now().choice?.why).toBe('someoneElses');
    expect(theirs.text).toBeNull();
    expect(await account.choose('neither')).toBeNull();
    expect(now().user).toBeNull();
  }
  // A failed sign-in doesn't forget either.
  theirs.fails = 'offline';
  expect(await account.signIn()).toBe('offline');
  theirs.fails = null;
  await account.signIn();
  expect(await account.choose('phone')).toBeNull();
  expect(theirs.notes).toHaveLength(2);
});

test('once kept data is erased, there is nothing to ask about', async () => {
  const r = await rig(['x']);
  await r.account.signIn();
  await r.account.logOutKeepingData();
  expect(state(r).keptFrom).not.toBe('');
  erase(r);
  r.account.saveSoon();
  await r.account.save();
  expect(state(r).keptFrom).toBe('');
});

test('the same person isn’t asked', async () => {
  const r = await rig(['mine']);
  await r.account.signIn();
  await r.account.deleteSaved();
  expect(await r.account.signIn()).toBeNull();
  expect(state(r).choice).toBeNull();
  expect(r.cloud.text).not.toBeNull();
});

test('a backup deleted on another phone stays deleted, unless it is asked for', async () => {
  const r = await rig(['a']);
  await r.account.signIn();
  r.cloud.text = null;
  add(r, 'b');
  expect(await r.account.save()).toBe(false);
  expect(r.cloud.text).toBeNull();
  expect(state(r).problem).toBe('gone');
  expect(await r.account.save(true)).toBe(true);
  expect(state(r).problem).toBeNull();
  expect(r.cloud.notes).toHaveLength(2);
});

test('saving goes on while Google’s screen is open', async () => {
  const r = await rig(['a']);
  await r.account.signIn();
  let open = () => {};
  r.google.gate = new Promise((done) => (open = done));
  const again = r.account.signIn();
  await Promise.resolve();
  expect(state(r).busy).toBe('signingIn');
  add(r, 'b');
  expect(await r.account.save()).toBe(true);
  expect(state(r).busy).toBe('signingIn');
  open();
  await again;
  expect(state(r).busy).toBeNull();
});

test('what is written can be read, and nothing else', () => {
  const data = backup('a');
  expect(readBackup(JSON.stringify(makeBackup(data, 'd', 5)))).toEqual(makeBackup(data, 'd', 5));
  expect(() => readBackup('{"app":"peppercorn","version":2,"data":{"categories":[]}}')).toThrow(AccountError);
  expect(() => readBackup(writeData(sample))).toThrow(AccountError);
});
