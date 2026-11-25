import { Directory, File, Paths } from 'expo-file-system';

/** The one file everything is saved in. An interface, so what happens when it fails can be tested. */
export interface Disk {
  /** `null` is surely not there: a first launch. Throws when it is there but couldn't be opened. */
  read(): Promise<string | null>;
  /** Writes all of it in place of what was there, or throws and leaves what was there. */
  write(text: string): Promise<void>;
  /** Keeps text that couldn't be understood where it won't be written over. */
  setAside(text: string): Promise<void>;
}

/** A file in the app's own folder. A write that is cut short never replaces what was there. */
export function fileDisk(name: string): Disk {
  const folder = new Directory(Paths.document);
  const file = new File(folder, name);
  const fresh = new File(folder, `${name}.new`);
  return {
    read: async () => {
      if (file.exists) return file.text();
      // Cut short after the old one was moved away and before the new one was in place.
      return fresh.exists ? fresh.text() : null;
    },
    write: async (text) => {
      if (fresh.exists) fresh.delete();
      fresh.create();
      fresh.write(text);
      if ((await fresh.text()).length !== text.length) throw new Error('Only part of it was written');
      await new File(folder, `${name}.new`).move(file, { overwrite: true });
    },
    setAside: async (text) => {
      const aside = new File(folder, `${name}.unreadable-${Date.now()}`);
      aside.create();
      aside.write(text);
    },
  };
}
