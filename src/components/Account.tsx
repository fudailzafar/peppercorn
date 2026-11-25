import { format, isToday, isYesterday } from 'date-fns';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { choose, deleteAccountData, logOut, logOutKeepingData, save, signIn, useAccount } from '../lib/account';
import type { AccountProblem } from '../lib/googleSignInTypes';
import { Haptics } from '../lib/haptics';
import { useStore, useUi } from '../lib/store';
import { shape } from '../theme/material';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { BottomSheet, Button, IconAvatar, ListItem, StateLayer } from './material';
import { ConfirmSheet } from './Overlays';
import { SettingsRow, SettingsSection } from './SettingsBits';

const PROBLEM: Record<AccountProblem, string> = {
  unavailable: 'Google sign-in isn’t available in this version.',
  cancelled: 'Sign-in cancelled',
  permission: 'Allow Google Drive access to save your data.',
  signedOut: 'Sign in again to keep saving.',
  wrongAccount: 'That’s a different Google account. Use the one you signed in with.',
  conflict: 'Newer data was saved on another phone.',
  offline: 'You’re offline. Try again when you’re connected.',
  full: 'Your Google storage is full.',
  newerVersion: 'Update Peppercorn to open your saved data.',
  unreadable: 'Your saved data couldn’t be read.',
  failed: 'Couldn’t reach Google. Try again.',
};

export const problemText = (p: AccountProblem) => PROBLEM[p];

/** "today, 10:42 am" */
function when(ms: number) {
  const time = format(ms, 'h:mm aaa');
  if (isToday(ms)) return `today, ${time}`;
  if (isYesterday(ms)) return `yesterday, ${time}`;
  return `${format(ms, 'd MMM yyyy')}, ${time}`;
}

const useProblemToast = () => {
  const showToast = useUi((s) => s.showToast);
  return (p: AccountProblem | null) => {
    if (p && p !== 'cancelled') showToast({ title: PROBLEM[p], icon: 'alert-circle', tone: 'error' });
  };
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

/** The account part of the You tab: signing in, or what is saved and the ways to leave. */
export function AccountSection() {
  const { m3 } = useTheme();
  const { user, busy, problem, savedAt } = useAccount();
  const showToast = useUi((s) => s.showToast);
  const toast = useProblemToast();
  const [leaving, setLeaving] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const connect = async () => {
    Haptics.selection();
    toast(await signIn());
  };

  const leave = async () => {
    setLeaving(false);
    // A conflict opens its own question instead.
    if (!(await logOut()) && !useAccount.getState().choice) setStuck(true);
  };

  if (!user) {
    return (
      <SettingsSection title="Account">
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
            Save your data to your Google Drive, and get it back when you sign in again.
          </AppText>
          <GoogleButton onPress={connect} />
        </View>
        <View style={{ marginTop: 8 }}>
          <SettingsRow icon="log-out" label="Log out" onPress={() => setLeaving(true)} />
        </View>
        <ConfirmSheet
          visible={leaving}
          title="Log out?"
          message="You’ll return to the welcome screen. Your data stays on this phone."
          confirmLabel="Log out"
          destructive={false}
          onCancel={() => setLeaving(false)}
          onConfirm={() => {
            setLeaving(false);
            // Without an account nothing is saved elsewhere, so nothing is removed. Home opens the welcome screen.
            useStore.getState().updateSettings({ welcomed: false });
          }}
        />
      </SettingsSection>
    );
  }

  const again = problem === 'signedOut' || problem === 'permission';
  const status =
    busy === 'saving' || busy === 'leaving'
      ? 'Saving…'
      : busy === 'signingIn'
        ? 'Signing in…'
        : busy === 'deleting'
          ? 'Deleting…'
          : problem
            ? PROBLEM[problem]
            : savedAt
              ? `Saved ${when(savedAt)}`
              : 'Not saved yet';

  return (
    <SettingsSection title="Account">
      <ListItem
        icon={busy ? 'sync' : problem || !savedAt ? 'cloud-off' : 'cloud'}
        headline="Google Drive"
        supporting={status}
        onPress={again ? connect : () => void save(true)}
        trailing={
          busy ? undefined : (
            <AppText variant="labelLarge" color={m3.primary}>
              {again ? 'Sign in' : problem === 'conflict' ? 'Choose' : problem ? 'Try again' : 'Save now'}
            </AppText>
          )
        }
      />
      <SettingsRow icon="log-out" label="Log out" onPress={() => setLeaving(true)} />
      <SettingsRow icon="trash-bin" label="Delete saved data" destructive onPress={() => setDeleting(true)} />

      <ConfirmSheet
        visible={leaving}
        title="Log out?"
        message="Your data is saved to your Google Drive, then removed from this phone. Sign in again to get it back."
        confirmLabel="Log out"
        destructive={false}
        onCancel={() => setLeaving(false)}
        onConfirm={leave}
      />
      <ConfirmSheet
        visible={stuck}
        title="Your data isn’t saved"
        message={`${problem ? PROBLEM[problem] : 'Couldn’t reach Google.'} You can log out and leave your data on this phone.`}
        confirmLabel="Log out, keep data"
        cancelLabel="Stay"
        destructive={false}
        onCancel={() => setStuck(false)}
        onConfirm={() => {
          setStuck(false);
          void logOutKeepingData();
        }}
      />
      <ConfirmSheet
        visible={deleting}
        title="Delete your saved data?"
        message="It’s deleted from your Google Drive and you’re signed out. Your data on this phone stays. You can’t undo this."
        onCancel={() => setDeleting(false)}
        onConfirm={async () => {
          setDeleting(false);
          const p = await deleteAccountData();
          if (p) toast(p);
          else showToast({ title: 'Saved data deleted', icon: 'checkmark-circle', tone: 'success' }, 2200);
        }}
      />
    </SettingsSection>
  );
}

const entries = (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`;

/** Asks which data to keep when the phone and the saved data differ. */
export function AccountChoice() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const asked = useAccount((s) => s.choice);
  // Keeps its words while the sheet slides away.
  const [choice, setChoice] = useState(asked);
  if (asked && asked !== choice) setChoice(asked);
  const busy = useAccount((s) => s.busy !== null);
  const here = useStore((s) => s.transactions.length);
  const toast = useProblemToast();
  const pick = async (keep: Parameters<typeof choose>[0]) => {
    Haptics.selection();
    toast(await choose(keep));
  };
  return (
    <BottomSheet visible={asked !== null} onClose={() => void pick('neither')} bottomInset={insets.bottom}>
      <AppText variant="titleLarge">Which data do you want to keep?</AppText>
      <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={{ marginTop: 8, marginBottom: 12 }}>
        {choice?.signingIn === false ? 'Another phone saved to this account. ' : 'This phone and your Google Drive both have data. '}
        The other is replaced, and you can’t undo this.
      </AppText>
      <View style={{ marginHorizontal: -16 }}>
        <ListItem leading={<IconAvatar icon="cloud" />} headline="Google Drive" supporting={choice ? `${entries(choice.saved.data.transactions.length)}, saved ${when(choice.saved.savedAt)}` : undefined} chevron onPress={busy ? undefined : () => void pick('saved')} />
        <ListItem leading={<IconAvatar icon="phone-portrait-outline" />} headline="This phone" supporting={entries(here)} chevron onPress={busy ? undefined : () => void pick('phone')} />
      </View>
      <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
        <Button variant="text" label={choice?.signingIn === false ? 'Not now' : 'Cancel sign-in'} onPress={() => void pick('neither')} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  google: { height: 56, borderRadius: shape.full, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24, overflow: 'hidden' },
  g: { width: 24, height: 24 },
});
