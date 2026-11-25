import { AccountError, type Cloud, type Google, type SavedFile } from './types';

/*
 * One file in the hidden "app data" folder of the person's own Google Drive. Only Peppercorn can open that folder, and
 * Peppercorn can open nothing else. https://developers.google.com/workspace/drive/api/guides/appdata
 */
const FILES = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const NAME = 'peppercorn.json';
const TIMEOUT = 30_000;

interface Init {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/** Drive, as the account sees it. */
export function drive(google: Google): Cloud {
  async function request(url: string, init: Init = {}, retry = true): Promise<Response> {
    const token = await google.token();
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT);
    let res: Response;
    try {
      res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` }, signal: abort.signal });
    } catch {
      throw new AccountError('offline');
    } finally {
      clearTimeout(timer);
    }
    if (res.ok) return res;
    // An expired token: once more with a fresh one.
    if (res.status === 401 && retry) {
      await google.dropToken(token);
      return request(url, init, false);
    }
    if (res.status === 401) throw new AccountError('signedOut');
    const reason = await res.text().catch(() => '');
    if (reason.includes('storageQuotaExceeded')) throw new AccountError('full');
    if (/insufficient/i.test(reason)) throw new AccountError('permission');
    throw new AccountError(res.status >= 500 ? 'offline' : 'failed');
  }

  async function list(): Promise<SavedFile[]> {
    const q = encodeURIComponent(`name = '${NAME}' and trashed = false`);
    const res = await request(`${FILES}?spaces=appDataFolder&q=${q}&orderBy=modifiedTime%20desc&fields=files(id,modifiedTime)`);
    return ((await res.json()) as { files?: SavedFile[] }).files ?? [];
  }

  return {
    find: async () => (await list())[0] ?? null,

    read: async (file) => (await request(`${FILES}/${file.id}?alt=media`)).text(),

    write: async (file, text) => {
      if (file) {
        const url = `${UPLOAD}/${file.id}?uploadType=media&fields=id,modifiedTime`;
        const res = await request(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: text });
        return (await res.json()) as SavedFile;
      }
      const edge = `peppercorn-${Date.now()}`;
      const part = (body: string) => `--${edge}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${body}\r\n`;
      const about = JSON.stringify({ name: NAME, parents: ['appDataFolder'] });
      const res = await request(`${UPLOAD}?uploadType=multipart&fields=id,modifiedTime`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${edge}` },
        body: `${part(about)}${part(text)}--${edge}--`,
      });
      return (await res.json()) as SavedFile;
    },

    remove: async () => {
      for (const file of await list()) await request(`${FILES}/${file.id}`, { method: 'DELETE' });
    },
  };
}
