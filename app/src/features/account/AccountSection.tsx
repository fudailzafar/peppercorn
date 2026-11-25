import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AccountProblem } from '@/account/types';
import { toDay } from '@/domain/dates';
import { haptics } from '@/lib/haptics';
import { account, messages, store } from '@/state/app';
import { useAccount, useNow } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Confirm } from '@/ui/Confirm';
import { ListItem, Subheader } from '@/ui/material';
import { LinkRow } from '@/ui/SettingsRows';
import { GoogleButton } from './GoogleButton';
import { PROBLEM, when } from './words';

const tell = (p: AccountProblem | null) => {
  if (p && p !== 'cancelled') messages.warn(PROBLEM[p]);
};

const signIn = async () => {
  haptics.select();
  tell(await account.signIn());
};

const deleteSaved = async () => {
  const problem = await account.deleteSaved();
  if (problem) tell(problem);
  else messages.show('Saved data deleted');
};

const BUSY = { saving: 'Saving…', leaving: 'Saving…', signingIn: 'Signing in…', deleting: 'Deleting…' } as const;

/** The account part of the You tab: signing in, or what is saved and the ways to leave. */
export function AccountSection() {
  const signedIn = useAccount((s) => s.user !== null);
  return (
    <>
      <Subheader text="Account" />
      {signedIn ? <SignedIn /> : <SignedOut />}
    </>
  );
}

function SignedOut() {
  const { m3 } = useTheme();
  const [leaving, setLeaving] = useState(false);
  return (
    <>
      <View style={styles.invite}>
        <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
          Save your data to your Google Drive, and get it back when you sign in again.
        </AppText>
        <GoogleButton onPress={signIn} />
      </View>
      <LinkRow icon="log-out" label="Log out" onPress={() => setLeaving(true)} />
      {/* Without an account nothing is saved elsewhere, so nothing is removed. */}
      <Confirm
        visible={leaving}
        title="Log out?"
        message="You’ll return to the welcome screen. Your data stays on this phone."
        confirm="Log out"
        destructive={false}
        onCancel={() => setLeaving(false)}
        onConfirm={() => {
          setLeaving(false);
          store.set({ welcomed: false });
        }}
      />
    </>
  );
}

function SignedIn() {
  const { m3 } = useTheme();
  const today = toDay(useNow());
  const busy = useAccount((s) => s.busy);
  const problem = useAccount((s) => s.problem);
  const savedAt = useAccount((s) => s.savedAt);
  const [asking, setAsking] = useState<'leave' | 'stuck' | 'delete' | null>(null);
  const close = () => setAsking(null);

  const leave = async () => {
    close();
    // A conflict opens its own question instead.
    if (!(await account.logOut()) && !account.state.getState().choice) setAsking('stuck');
  };

  const again = problem === 'signedOut' || problem === 'permission';
  const action = again ? 'Sign in' : problem === 'conflict' || problem === 'unreadable' ? 'Choose' : problem === 'gone' ? 'Save again' : problem ? 'Try again' : 'Save now';
  const status = busy ? BUSY[busy] : problem ? PROBLEM[problem] : savedAt ? `Saved ${when(savedAt, today)}` : 'Not saved yet';
  return (
    <>
      <ListItem
        icon={busy ? 'sync' : problem || !savedAt ? 'cloud-off' : 'cloud'}
        headline="Google Drive"
        supporting={status}
        accessibilityLabel={`Google Drive, ${status}${busy ? '' : `, ${action}`}`}
        onPress={again ? signIn : () => void account.save(true)}
        trailing={
          busy ? undefined : (
            <AppText variant="labelLarge" color={m3.primary}>
              {action}
            </AppText>
          )
        }
      />
      <LinkRow icon="log-out" label="Log out" onPress={() => setAsking('leave')} />
      <LinkRow icon="trash-bin" label="Delete saved data" destructive onPress={() => setAsking('delete')} />

      <Confirm
        visible={asking === 'leave'}
        title="Log out?"
        message="Your data is saved to your Google Drive, then removed from this phone. Sign in again to get it back."
        confirm="Log out"
        destructive={false}
        onCancel={close}
        onConfirm={leave}
      />
      <Confirm
        visible={asking === 'stuck'}
        title="Your data isn’t saved"
        message={`${PROBLEM[problem ?? 'failed']} You can log out and leave your data on this phone.`}
        confirm="Log out, keep data"
        cancel="Stay"
        destructive={false}
        onCancel={close}
        onConfirm={() => {
          close();
          void account.logOutKeepingData();
        }}
      />
      <Confirm
        visible={asking === 'delete'}
        title="Delete your saved data?"
        message="It’s deleted from your Google Drive and you’re signed out. Your data on this phone stays. You can’t undo this."
        onCancel={close}
        onConfirm={() => {
          close();
          void deleteSaved();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({ invite: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 } });
