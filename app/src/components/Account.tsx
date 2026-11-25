import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Choice, Keep } from '../account/account';
import type { AccountProblem } from '../account/types';
import { account, messages, store } from '../data/app';
import { useAccount, useAppState, useNow } from '../data/hooks';
import { addDays, shortLabel, timeLabel, toDay } from '../domain/dates';
import { haptics } from '../hooks/haptics';
import { shape } from '../theme/material';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { Confirm } from './Confirm';
import { countOf } from './labels';
import { BottomSheet, Button, IconAvatar, ListItem, StateLayer, Subheader } from './material';
import { LinkRow } from './SettingsRows';

const PROBLEM: Record<AccountProblem, string> = {
  unavailable: 'Google sign-in isn’t available in this version.',
  cancelled: 'Sign-in cancelled',
  permission: 'Allow Google Drive access to save your data.',
  signedOut: 'Sign in again to keep saving.',
  wrongAccount: 'That’s a different Google account. Use the one you signed in with.',
  conflict: 'Newer data was saved on another phone.',
  offline: 'You’re offline. Try again when you’re connected.',
  full: 'Your Google storage is full.',
  storage: 'Couldn’t save on this phone. Free up some space and try again.',
  gone: 'Your saved data was deleted from Google Drive.',
  newerVersion: 'Update Peppercorn to open your saved data.',
  unreadable: 'Your saved data couldn’t be read.',
  failed: 'Couldn’t reach Google. Try again.',
};

export const problemText = (p: AccountProblem) => PROBLEM[p];

/** "today, 10:42 am" */
function when(ms: number, today: string): string {
  const day = toDay(ms);
  const on = day === today ? 'today' : day === addDays(today, -1) ? 'yesterday' : shortLabel(day, today);
  return `${on}, ${timeLabel(ms).toLowerCase()}`;
}

const tell = (p: AccountProblem | null) => {
  if (p && p !== 'cancelled') messages.warn(PROBLEM[p]);
};

// Google's own button colours and "G": https://developers.google.com/identity/branding-guidelines
const GOOGLE = {
  light: { fill: '#FFFFFF', stroke: '#747775', text: '#1F1F1F' },
  dark: { fill: '#131314', stroke: '#8E918F', text: '#E3E3E3' },
};

/** Google's sign-in button, to its branding rules. */
export function GoogleButton({ onPress }: { onPress: () => void }) {
  const { dark } = useTheme();
  const busy = useAccount((s) => s.busy === 'signingIn');
  const c = GOOGLE[dark ? 'dark' : 'light'];
  const label = busy ? 'Signing in…' : 'Continue with Google';
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      android_ripple={{ color: `${c.text}1F` }}
      style={[styles.google, { backgroundColor: c.fill, borderColor: c.stroke }]}
    >
      {({ pressed }) => (
        <>
          <StateLayer pressed={pressed} color={c.text} radius={shape.full} />
          <Image source={require('../../assets/google-g.png')} style={styles.g} accessible={false} />
          <AppText variant="titleMedium" color={c.text}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

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

const TITLE: Record<Choice['why'], string> = {
  differs: 'Which data do you want to keep?',
  unreadable: 'Your saved data can’t be read',
  someoneElses: 'Keep this phone’s data?',
};

const THIS_PHONE: Record<Choice['why'], string> = { differs: 'This phone', unreadable: 'Replace with this phone’s data', someoneElses: 'Keep it' };

function explain({ why, signingIn }: Choice): string {
  switch (why) {
    case 'differs':
      return `${signingIn ? 'This phone and your Google Drive both have data.' : 'Another phone saved to this account.'} The other is replaced, and you can’t undo this.`;
    case 'unreadable':
      return 'What’s in your Google Drive is damaged. You can replace it with what’s on this phone, and you can’t undo this.';
    case 'someoneElses':
      return 'It was saved to a different Google account. If you keep it, it’s saved to yours too. To start empty, cancel, then erase the data in You first.';
  }
}

/** Asks which data to keep. */
export function AccountChoice() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const today = toDay(useNow());
  const asked = useAccount((s) => s.choice);
  const busy = useAccount((s) => s.busy !== null);
  const here = useAppState((s) => s.data.entries.length);
  // Keeps its words while the sheet slides away.
  const [choice, setChoice] = useState(asked);
  // Said in the sheet, which covers the line at the bottom of the screen.
  const [failed, setFailed] = useState<AccountProblem | null>(null);
  if (asked && asked !== choice) {
    setChoice(asked);
    setFailed(null);
  }
  const pick = async (keep: Keep) => {
    haptics.select();
    setFailed(await account.choose(keep));
  };
  return (
    <BottomSheet visible={asked !== null} onClose={() => void pick('neither')} bottomInset={insets.bottom}>
      {choice ? (
        <>
          <AppText variant="titleLarge" accessibilityRole="header">
            {TITLE[choice.why]}
          </AppText>
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={styles.explain}>
            {explain(choice)}
          </AppText>
          <View style={styles.answers}>
            {choice.saved ? (
              <ListItem
                leading={<IconAvatar icon="cloud" />}
                headline="Google Drive"
                supporting={`${countOf(choice.saved.data.entries.length, 'entry', 'entries')}, saved ${when(choice.saved.savedAt, today)}`}
                chevron
                onPress={busy ? undefined : () => void pick('saved')}
              />
            ) : null}
            <ListItem leading={<IconAvatar icon="phone-portrait-outline" />} headline={THIS_PHONE[choice.why]} supporting={countOf(here, 'entry', 'entries')} chevron onPress={busy ? undefined : () => void pick('phone')} />
          </View>
          {failed ? (
            <AppText variant="bodyMedium" color={m3.error} accessibilityLiveRegion="polite" accessibilityRole="alert">
              {PROBLEM[failed]}
            </AppText>
          ) : null}
          <View style={styles.cancel}>
            <Button variant="text" label={choice.signingIn ? 'Cancel sign-in' : 'Not now'} onPress={() => void pick('neither')} />
          </View>
        </>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  google: { height: 56, borderRadius: shape.full, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24, overflow: 'hidden' },
  g: { width: 24, height: 24 },
  invite: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  explain: { marginTop: 8, marginBottom: 12 },
  answers: { marginHorizontal: -16 },
  cancel: { alignItems: 'flex-end', marginTop: 8 },
});
