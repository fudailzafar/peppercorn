import { fileDisk } from '@/data/disk';

/** The phone's files. Writing takes a moment, as it does on a phone, and the file is empty until then. */
const mockFiles = new Map<string, string>();
let mockFull = false;

jest.mock('expo-file-system', () => {
  class Directory {}
  class File {
    readonly name: string;
    constructor(_: Directory, name: string) {
      this.name = name;
    }
    get exists() {
      return mockFiles.has(this.name);
    }
    create() {
      if (this.exists) throw new Error('already there');
      mockFiles.set(this.name, '');
    }
    delete() {
      mockFiles.delete(this.name);
    }
    async text() {
      const text = mockFiles.get(this.name);
      if (text === undefined) throw new Error('not there');
      return text;
    }
    async write(text: string) {
      await new Promise((done) => setTimeout(done, 5));
      if (mockFull) throw new Error('full');
      mockFiles.set(this.name, text);
    }
    async move(to: File, { overwrite }: { overwrite: boolean }) {
      if (to.exists && !overwrite) throw new Error('already there');
      mockFiles.set(to.name, await this.text());
      this.delete();
    }
  }
  return { __esModule: true, File, Directory, Paths: { document: new Directory() } };
});

beforeEach(() => {
  mockFiles.clear();
  mockFull = false;
});

test('what is written is there, whole, again and again', async () => {
  const disk = fileDisk('a.json');
  expect(await disk.read()).toBeNull();
  for (const text of ['{}', '{"note":"₹ 🍔"}', '{"longer":"than before"}']) {
    await disk.write(text);
    expect(await disk.read()).toBe(text);
  }
  expect([...mockFiles.keys()]).toEqual(['a.json']);
});

test('a write that fails leaves what was there, and the next one works', async () => {
  const disk = fileDisk('a.json');
  await disk.write('old');
  mockFull = true;
  await expect(disk.write('new')).rejects.toThrow();
  expect(await disk.read()).toBe('old');
  mockFull = false;
  await disk.write('new');
  expect(await disk.read()).toBe('new');
});

test('cut short between the old and the new, the new one is read', async () => {
  mockFiles.set('a.json.new', 'whole');
  expect(await fileDisk('a.json').read()).toBe('whole');
});

test('what is set aside is all there', async () => {
  await fileDisk('a.json').setAside('broken');
  expect([...mockFiles.values()]).toEqual(['broken']);
});
