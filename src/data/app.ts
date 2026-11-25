import { AppState, Platform } from 'react-native';
import { Account } from '../account/account';
import { drive } from '../account/drive';
import { googleAccount } from '../account/google';
import { phoneCurrency } from '../domain/money';
import { fileDisk } from './disk';
import { Messages } from './messages';
import { fetchPage, Prices } from './prices';
import { Store } from './store';

/* The few things that live as long as the app does, and how they are put together. */

const now = () => Date.now();

/** Unique on this phone and, in practice, anywhere. */
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

// A browser can't read another site's page, so the website passes it on (see scripts/build-web.sh).
const METALS = Platform.OS === 'web' ? '/metals' : 'https://www.livechennai.com/gold_silverrate.asp';

export const store = new Store({ disk: fileDisk('peppercorn.json'), now, newId, currency: () => phoneCurrency() });
export const messages = new Messages();
export const prices = new Prices(store, METALS, now, fetchPage);
export const account = new Account(store, googleAccount, drive(googleAccount), fileDisk('account.json'), now, newId, () => void prices.refresh());

/** Opens everything, and keeps up with the app being opened and left. Returns how to stop. */
export function startApp(): () => void {
  const opened = async () => {
    if (!(await store.open())) return;
    store.catchUp();
    void prices.refresh();
    account.saveSoon();
  };
  void account.open().then(opened);
  const stop = account.start();
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') void opened();
    else {
      void store.flush();
      account.saveSoon();
    }
  });
  return () => {
    stop();
    sub.remove();
  };
}
