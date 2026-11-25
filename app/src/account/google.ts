import { AccountError, type Google } from './types';

const unavailable = async (): Promise<never> => {
  throw new AccountError('unavailable');
};

/** What web and iOS get: sign-in exists on Android only (google.android.ts). */
export const googleAccount: Google = {
  signIn: unavailable,
  token: unavailable,
  dropToken: async () => {},
  signOut: async () => {},
  revoke: async () => {},
};
