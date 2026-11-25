import { createStore, type StoreApi } from 'zustand/vanilla';
import { assetCategories, priced, soundDays } from '../domain/assets';
import { current } from '../domain/budgets';
import { toDay } from '../domain/dates';
import { categoryOf, caughtUp, schedule, type Often } from '../domain/entries';
import type { AppData, AssetId, Budget, Category, Day, Entry, Owned, Saved, Settings } from '../domain/model';
import type { Disk } from './disk';

export interface State {
  data: AppData;
  /**
   * 'loading' until the file is read. 'locked' if it is there but couldn't be opened: nothing is written until it can be,
   * so it is never replaced.
   */
  status: 'loading' | 'ready' | 'locked';
  /** The last write failed (no room, say). What's in memory is newer than the file. */
  unsaved: boolean;
  /** The file was damaged. It is kept beside the new one. */
  recovered: boolean;
}

export interface Env {
  disk: Disk;
  now: () => number;
  newId: () => string;
  currency: () => string;
}

const starter = (name: string, emoji: string, colour: string, income = false) => ({ name, emoji, colour, income });

const STARTERS = [
  starter('Food', '🍔', '#FE724E'),
  starter('Transport', '🚌', '#279AF4'),
  starter('Shopping', '🛍️', '#FF78A3'),
  starter('Bills', '🧾', '#6A7CF9'),
  starter('Fun', '🎬', '#FDBC3B'),
  starter('Health', '💊', '#6BB2AA'),
  starter('Salary', '💼', '#76FBB1', true),
];

export const defaultSettings = (currency: string): Settings => ({
  currency,
  cents: true,
  signs: true,
  theme: 'system',
  income: true,
  upcoming: true,
  animated: true,
  weekStart: 0,
  monthStart: 1,
  haptics: 'light',
  typing: 'point',
  historySpan: 'week',
  historyTotal: 'net',
  name: '',
  welcomed: false,
});

/** An entry as the person gives it. The store adds the rest. */
export type Draft = Omit<Entry, 'id' | 'repeat' | 'series'> & { often: Often | null };

const VERSION = 1;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isList = (v: unknown): v is { id: string }[] => Array.isArray(v) && v.every((x) => isRecord(x) && typeof x.id === 'string');
const isEntries = (v: unknown): v is Entry[] => isList(v) && v.every((e) => Number.isFinite((e as Entry).amount) && Number.isFinite((e as Entry).date));

/** Whether something read is clearly all of Peppercorn's data: a file cut short must not pass for an empty one. */
export const isSaved = (v: unknown): v is Saved => isRecord(v) && isList(v.categories) && isEntries(v.entries) && isList(v.budgets) && isList(v.owned) && isRecord(v.settings);

/** Reads what was saved. Throws if it can't be understood. */
function readData(text: string, currency: string): AppData {
  const file = JSON.parse(text) as unknown;
  if (!isRecord(file) || file.version !== VERSION || !isSaved(file.data)) throw new Error('Not Peppercorn’s data');
  const { prices, priceError, ...saved } = file.data as AppData;
  const books = isRecord(prices) ? (prices as AppData['prices']) : {};
  return {
    ...saved,
    // New options appear with their defaults after an update.
    settings: { ...defaultSettings(currency), ...saved.settings },
    prices: Object.fromEntries(Object.entries(books).map(([id, book]) => [id, { fetchedAt: Number(book?.fetchedAt) || 0, days: soundDays(book?.days ?? {}) }])),
    priceError: priceError === true,
  };
}

export const writeData = (data: AppData): string => JSON.stringify({ version: VERSION, data });

/** Changes are written once things are quiet for this long. */
const QUIET = 250;
/** A failed write is tried again after this long. */
const AGAIN = 8000;

/**
 * Everything on this phone, in one file. Changes happen in memory straight away and are written shortly after; `flush`
 * writes at once, for when the app is being left.
 */
export class Store {
  readonly state: StoreApi<State>;
  private written: AppData | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private writing: Promise<boolean> = Promise.resolve(true);

  constructor(private readonly env: Env) {
    this.state = createStore<State>(() => ({ data: this.seeded(this.fresh()), status: 'loading', unsaved: false, recovered: false }));
  }

  get data(): AppData {
    return this.state.getState().data;
  }

  private get today(): Day {
    return toDay(this.env.now());
  }

  private fresh(): AppData {
    return { categories: [], entries: [], budgets: [], owned: [], settings: defaultSettings(this.env.currency()), prices: {}, priceError: false };
  }

  // MARK: Opening

  /** Reads the file. True if it is open. Also tries again after it couldn't be opened. */
  async open(): Promise<boolean> {
    if (this.state.getState().status === 'ready') return true;
    let text: string | null;
    try {
      text = await this.env.disk.read();
    } catch {
      this.state.setState({ status: 'locked' });
      return false;
    }
    let data = this.fresh();
    let recovered = false;
    if (text !== null) {
      try {
        data = readData(text, this.env.currency());
      } catch {
        // Damaged: set aside before anything new is written.
        try {
          await this.env.disk.setAside(text);
        } catch {
          this.state.setState({ status: 'locked' });
          return false;
        }
        recovered = true;
      }
    }
    this.state.setState({ data: this.seeded(data), status: 'ready', recovered });
    this.catchUp();
    return true;
  }

  // MARK: Writing

  /** Writes what isn't written yet. False if it couldn't; the file then still holds what was saved before. */
  flush(): Promise<boolean> {
    clearTimeout(this.timer);
    // One at a time, so an older write can't land after a newer one.
    this.writing = this.writing.then(() => this.write());
    return this.writing;
  }

  private async write(): Promise<boolean> {
    const { data, status } = this.state.getState();
    if (status !== 'ready') return false;
    let done = data === this.written;
    if (!done) {
      try {
        await this.env.disk.write(writeData(data));
        this.written = data;
        done = true;
      } catch {
        this.later(AGAIN);
      }
    }
    this.state.setState({ unsaved: !done });
    return done;
  }

  private later(ms: number) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), ms);
  }

  private change(f: (data: AppData) => AppData) {
    const before = this.data;
    const after = f(before);
    if (after === before) return;
    this.state.setState({ data: after });
    this.later(QUIET);
  }

  // MARK: Keeping up with time

  /** First-run categories, and the fixed ones behind the assets. */
  private seeded(data: AppData): AppData {
    const own = data.categories.filter((c) => !c.asset);
    return { ...data, categories: [...(own.length > 0 ? own : STARTERS.map((s, order) => ({ ...s, id: this.env.newId(), order }))), ...assetCategories()] };
  }

  /** Adds repeating entries that came due and moves finished budgets on to their current period. */
  catchUp() {
    const today = this.today;
    this.change((d) => {
      const entries = priced({ entries: caughtUp(d.entries, today, this.env.newId), prices: d.prices });
      const budgets = d.budgets.map((b) => current(b, today));
      const moved = budgets.some((b, i) => b !== d.budgets[i]);
      return entries === d.entries && !moved ? d : { ...d, entries, budgets: moved ? budgets : d.budgets };
    });
  }

  // MARK: Entries

  /** An entry without a note is called after its category. */
  private named(note: string, categoryId: string | null): string {
    return note.trim() || (categoryOf(this.data, categoryId)?.name ?? '');
  }

  private made({ often, ...draft }: Draft, id: string, old?: Entry): Entry {
    const repeat = often ? schedule(often, draft.date, old, this.today) : undefined;
    const series = old?.series || repeat !== undefined;
    return { ...draft, id, note: this.named(draft.note, draft.categoryId), ...(repeat ? { repeat } : {}), ...(series ? { series } : {}) };
  }

  /** Adds an entry, with any past repeats it implies. Returns the ids of them all, its own first. */
  add(draft: Draft): string[] {
    const added = caughtUp([this.made(draft, this.env.newId())], this.today, this.env.newId);
    this.change((d) => ({ ...d, entries: priced({ entries: [...d.entries, ...added], prices: d.prices }) }));
    return added.map((e) => e.id);
  }

  /**
   * Changes an entry. One that has gone meanwhile (with its category, say) is added again rather than lost. Returns the ids
   * of any past repeats this added.
   */
  update(id: string, draft: Draft): string[] {
    const old = this.data.entries.find((e) => e.id === id);
    if (!old) return this.add(draft).slice(1);
    const all = caughtUp([this.made(draft, id, old)], this.today, this.env.newId);
    this.change((d) => ({ ...d, entries: priced({ entries: d.entries.flatMap((e) => (e.id === id ? all : [e])), prices: d.prices }) }));
    return all.slice(1).map((e) => e.id);
  }

  /** Takes back an `add`, or an `update` of what was `old`. */
  undo(added: readonly string[], old?: Entry) {
    const gone = new Set(added);
    this.change((d) => ({ ...d, entries: d.entries.filter((e) => !gone.has(e.id)).map((e) => (e.id === old?.id ? old : e)) }));
  }

  remove(id: string): Entry | undefined {
    const gone = this.data.entries.find((e) => e.id === id);
    if (gone) this.change((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
    return gone;
  }

  putBack(entry: Entry) {
    this.change((d) => (d.entries.some((e) => e.id === entry.id) ? d : { ...d, entries: [...d.entries, entry] }));
  }

  stopRepeating(id: string) {
    this.change((d) => ({
      ...d,
      entries: d.entries.map((e) => {
        if (e.id !== id) return e;
        const { repeat: _, ...plain } = e;
        return plain;
      }),
    }));
  }

  // MARK: Categories

  addCategory(c: Pick<Category, 'name' | 'emoji' | 'colour' | 'income'>) {
    this.change((d) => {
      const order = Math.max(-1, ...d.categories.filter((x) => x.income === c.income && !x.asset).map((x) => x.order)) + 1;
      return { ...d, categories: [...d.categories, { ...c, id: this.env.newId(), order }] };
    });
  }

  updateCategory(id: string, patch: Pick<Category, 'name' | 'emoji' | 'colour'>) {
    this.change((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }

  /** Its entries and budget go with it; the screen says so first. */
  removeCategory(id: string) {
    this.change((d) => ({
      ...d,
      categories: d.categories.filter((c) => c.id !== id),
      entries: d.entries.filter((e) => e.categoryId !== id),
      budgets: d.budgets.filter((b) => b.categoryId !== id),
    }));
  }

  /** Moves a category `by` places among its kind. */
  moveCategory(id: string, by: number) {
    this.change((d) => {
      const moved = d.categories.find((c) => c.id === id);
      if (!moved) return d;
      const kind = d.categories.filter((c) => c.income === moved.income && !c.asset).sort((a, b) => a.order - b.order);
      const from = kind.indexOf(moved);
      if (!kind[from + by]) return d;
      kind.splice(from + by, 0, ...kind.splice(from, 1));
      return { ...d, categories: d.categories.map((c) => (kind.includes(c) ? { ...c, order: kind.indexOf(c) } : c)) };
    });
  }

  // MARK: Budgets

  /** One budget for each category, and one overall: a second replaces the first. */
  saveBudget(b: Omit<Budget, 'id'>) {
    this.change((d) => {
      const mine = d.budgets.find((x) => x.categoryId === b.categoryId);
      return { ...d, budgets: mine ? d.budgets.map((x) => (x === mine ? { ...b, id: mine.id } : x)) : [...d.budgets, { ...b, id: this.env.newId() }] };
    });
  }

  removeBudget(id: string) {
    this.change((d) => ({ ...d, budgets: d.budgets.filter((b) => b.id !== id) }));
  }

  // MARK: Assets

  addOwned(o: Omit<Owned, 'id' | 'date'>) {
    this.change((d) => ({ ...d, owned: [...d.owned, { ...o, id: this.env.newId(), date: this.env.now() }] }));
  }

  removeOwned(id: string): Owned | undefined {
    const gone = this.data.owned.find((o) => o.id === id);
    if (gone) this.change((d) => ({ ...d, owned: d.owned.filter((o) => o.id !== id) }));
    return gone;
  }

  putBackOwned(o: Owned) {
    this.change((d) => (d.owned.some((x) => x.id === o.id) ? d : { ...d, owned: [...d.owned, o] }));
  }

  /** Adds prices. `fetchedAt` is left out for older ones filled in later: that isn't today's update. */
  savePrices(id: AssetId, days: Record<Day, number>, fetchedAt?: number) {
    this.change((d) => {
      const old = d.prices[id];
      return { ...d, prices: { ...d.prices, [id]: { days: { ...old?.days, ...days }, fetchedAt: fetchedAt ?? old?.fetchedAt ?? 0 } } };
    });
  }

  setPriceError(failed: boolean) {
    this.change((d) => (d.priceError === failed ? d : { ...d, priceError: failed }));
  }

  /** Purchases that waited for a price that is known now. */
  priceWaiting() {
    this.change((d) => {
      const entries = priced(d);
      return entries === d.entries ? d : { ...d, entries };
    });
  }

  // MARK: Settings, and the whole of it

  set(patch: Partial<Settings>) {
    this.change((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }

  /** Entries, assets and budgets go; categories and settings stay. */
  erase() {
    this.change((d) => ({ ...d, entries: [], budgets: [], owned: [] }));
  }

  snapshot(): Saved {
    const { categories, entries, budgets, owned, settings } = this.data;
    return { categories, entries, budgets, owned, settings: { ...settings, welcomed: false } };
  }

  /** Saved data in place of what's here. If it can't be written to this phone, what was here stays, and this is false. */
  async restore(saved: Saved): Promise<boolean> {
    const before = this.data;
    this.change((d) => this.seeded({ ...d, ...saved, settings: { ...defaultSettings(this.env.currency()), ...saved.settings, welcomed: true } }));
    this.catchUp();
    if (await this.flush()) return true;
    clearTimeout(this.timer);
    this.state.setState({ data: before });
    this.later(QUIET);
    return false;
  }

  /** Back to a fresh install. Prices are the same for everyone, so they stay. */
  reset() {
    this.change((d) => this.seeded({ ...this.fresh(), prices: d.prices }));
  }
}
