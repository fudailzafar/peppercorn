export interface GoogleUser {
  id: string;
  email: string;
  name: string;
}

/** Why something to do with the account didn't work. */
export type AccountProblem =
  /** This build can't sign in: Expo Go, the web preview, or no client ID yet. */
  | 'unavailable'
  /** The person closed Google's sheet. */
  | 'cancelled'
  /** The person didn't let Peppercorn use its Drive folder. */
  | 'permission'
  /** The Google session has ended. */
  | 'signedOut'
  /** Signing in again with another account than the one this phone's data belongs to. */
  | 'wrongAccount'
  /** Another phone saved since this one last did. */
  | 'conflict'
  | 'offline'
  /** The person's Google storage is full. */
  | 'full'
  /** This phone's storage is full. */
  | 'storage'
  /** What was saved was deleted, from another phone. */
  | 'gone'
  /** The saved data was made by a newer Peppercorn. */
  | 'newerVersion'
  | 'unreadable'
  | 'failed';

export class AccountError extends Error {
  constructor(readonly problem: AccountProblem) {
    super(problem);
  }
}

export const problemOf = (error: unknown): AccountProblem => (error instanceof AccountError ? error.problem : 'failed');

/** What the account needs from Google. An interface, so it can be tested without it. */
export interface Google {
  signIn(): Promise<GoogleUser>;
  token(): Promise<string>;
  dropToken(token: string): Promise<void>;
  signOut(): Promise<void>;
  revoke(email: string): Promise<void>;
}

export interface SavedFile {
  id: string;
  /** Changes with every save. */
  modifiedTime: string;
}

/** Where saved data lives. An interface, so it can be tested without Drive. */
export interface Cloud {
  /** The saved file, or null if nothing has been saved yet. */
  find(): Promise<SavedFile | null>;
  read(file: SavedFile): Promise<string>;
  /** Writes over `file`, or makes it. */
  write(file: SavedFile | null, text: string): Promise<SavedFile>;
  remove(): Promise<void>;
}
