import type { Disk } from './disk';

export type { Disk } from './disk';

/** The browser's own storage. Writing one key replaces it whole, or throws. */
export function fileDisk(name: string): Disk {
  return {
    read: async () => (typeof localStorage === 'undefined' ? null : localStorage.getItem(name)),
    write: async (text) => localStorage.setItem(name, text),
    setAside: async (text) => localStorage.setItem(`${name}.unreadable-${Date.now()}`, text),
  };
}
