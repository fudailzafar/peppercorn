import { AccountError, dropGoogleToken, googleToken } from './googleSignIn';

/*
 * One file in the hidden "app data" folder of the person's own Google Drive. Only Peppercorn can open that folder, and
 * Peppercorn can open nothing else. https://developers.google.com/workspace/drive/api/guides/appdata
 */
const FILES = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const NAME = 'peppercorn.json';
const TIMEOUT = 30_000;

export interface SavedFile {
  id: string;
  /** Changes with every save. */
  modifiedTime: string;
}

async function request(url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}, retry = true): Promise<Response> {
  const token = await googleToken();
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
    await dropGoogleToken(token);
    return request(url, init, false);
  }
  if (res.status === 401) throw new AccountError('signedOut');
  const reason = await res.text().catch(() => '');
  if (/storageQuotaExceeded/.test(reason)) throw new AccountError('full');
  if (/insufficient/i.test(reason)) throw new AccountError('permission');
  throw new AccountError(res.status >= 500 ? 'offline' : 'failed');
}

async function list(): Promise<SavedFile[]> {
  const query = `spaces=appDataFolder&q=${encodeURIComponent(`name = '${NAME}' and trashed = false`)}&orderBy=modifiedTime%20desc&fields=files(id,modifiedTime)`;
  const json = (await (await request(`${FILES}?${query}`)).json()) as { files?: SavedFile[] };
  return json.files ?? [];
}

/** The saved file, or null if nothing has been saved yet. */
export const findSaved = async (): Promise<SavedFile | null> => (await list())[0] ?? null;

export const readSaved = async (file: SavedFile): Promise<string> => (await request(`${FILES}/${file.id}?alt=media`)).text();

/** Writes over `file`, or makes it. */
export async function writeSaved(file: SavedFile | null, text: string): Promise<SavedFile> {
  if (file) {
    const res = await request(`${UPLOAD}/${file.id}?uploadType=media&fields=id,modifiedTime`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: text });
    return (await res.json()) as SavedFile;
  }
  const edge = `peppercorn-${Date.now()}`;
  const meta = JSON.stringify({ name: NAME, parents: ['appDataFolder'] });
  const part = (body: string) => `--${edge}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${body}\r\n`;
  const res = await request(`${UPLOAD}?uploadType=multipart&fields=id,modifiedTime`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${edge}` },
    body: `${part(meta)}${part(text)}--${edge}--`,
  });
  return (await res.json()) as SavedFile;
}

export async function deleteSaved(): Promise<void> {
  for (const file of await list()) await request(`${FILES}/${file.id}`, { method: 'DELETE' });
}
