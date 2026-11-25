import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import { AccountError, type Google, type GoogleUser } from './types';

/** Only Peppercorn's own hidden folder: it gives no access to the person's other files. */
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

type Library = typeof import('react-native-nitro-google-signin');

let library: Library | null = null;

/** The native library is loaded only when it's needed: Expo Go doesn't contain it and would crash. */
function google(): Library {
  if (library) return library;
  const webClientId = Constants.expoConfig?.extra?.googleWebClientId as string | undefined;
  if (isRunningInExpoGo() || !webClientId) throw new AccountError('unavailable');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('react-native-nitro-google-signin') as Library;
    loaded.GoogleOneTapSignIn.configure({ webClientId });
    library = loaded;
    return loaded;
  } catch {
    throw new AccountError('unavailable');
  }
}

/** The library's error codes, in Peppercorn's words. */
function problem(error: unknown): AccountError {
  if (error instanceof AccountError) return error;
  const code = (error as { code?: string } | null)?.code;
  if (code === 'SIGN_IN_CANCELLED') return new AccountError('cancelled');
  // Consent is needed again, or there is no session.
  if (code === 'SIGN_IN_REQUIRED' || code === 'IN_PROGRESS') return new AccountError('signedOut');
  return new AccountError('failed');
}

async function signIn(): Promise<GoogleUser> {
  const { GoogleOneTapSignIn, isSuccessResponse } = google();
  let user: GoogleUser;
  try {
    await GoogleOneTapSignIn.checkPlayServices();
    const response = await GoogleOneTapSignIn.presentExplicitSignIn();
    if (!isSuccessResponse(response)) throw new AccountError('cancelled');
    const u = response.data.user;
    user = { id: u.id, email: u.email ?? '', name: u.givenName ?? u.name ?? '' };
  } catch (error) {
    throw problem(error);
  }
  try {
    const { accessToken } = await GoogleOneTapSignIn.requestScopes([DRIVE_SCOPE]);
    if (!accessToken) throw new AccountError('permission');
  } catch (error) {
    await signOut();
    const p = problem(error);
    throw p.problem === 'cancelled' ? new AccountError('permission') : p;
  }
  return user;
}

/** These never fail: leaving works even when Google can't be reached. */
async function quietly(work: (g: Library['GoogleOneTapSignIn']) => Promise<void>): Promise<void> {
  try {
    await work(google().GoogleOneTapSignIn);
  } catch {
    // Nothing more to do on this phone.
  }
}

const signOut = () => quietly((g) => g.signOut());

/** Google sign-in on Android, with permission for Peppercorn's own hidden folder in Drive (nothing else there). */
export const googleAccount: Google = {
  signIn,
  token: async () => {
    const { GoogleOneTapSignIn } = google();
    try {
      return (await GoogleOneTapSignIn.getTokens()).accessToken;
    } catch (error) {
      throw problem(error);
    }
  },
  dropToken: (token) => quietly((g) => g.clearCachedAccessToken(token)),
  signOut,
  revoke: async (email) => {
    await quietly((g) => g.revokeAccess(email));
    await signOut();
  },
};
