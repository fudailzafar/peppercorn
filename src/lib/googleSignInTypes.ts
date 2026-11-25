export interface GoogleUser {
  id: string;
  email: string;
  name: string;
}

/** Why sign-in or a save stopped. */
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
  /** The saved data was made by a newer Peppercorn. */
  | 'newerVersion'
  | 'unreadable'
  | 'failed';

export class AccountError extends Error {
  constructor(readonly problem: AccountProblem) {
    super(problem);
  }
}
