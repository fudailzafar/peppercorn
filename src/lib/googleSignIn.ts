/*
 * Signing in with Google. This file is what web and iOS get: sign-in exists on Android only (googleSignIn.android.ts).
 */

import { AccountError, type GoogleUser } from './googleSignInTypes';

export { AccountError, type AccountProblem, type GoogleUser } from './googleSignInTypes';

/** Opens Google's account sheet and asks for Peppercorn's own Drive folder. */
export async function googleSignIn(): Promise<GoogleUser> {
  throw new AccountError('unavailable');
}

/** A Drive access token for the signed-in person, without showing anything. */
export async function googleToken(): Promise<string> {
  throw new AccountError('unavailable');
}

/** Drops a token Google no longer accepts, so the next one is fresh. */
export async function dropGoogleToken(_token: string): Promise<void> {}

export async function googleSignOut(): Promise<void> {}

/** Signs out and removes Peppercorn's access to the person's account. */
export async function googleRevoke(_email: string): Promise<void> {}
