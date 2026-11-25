import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Choice, Keep } from '@/account/account';
import type { AccountProblem } from '@/account/types';
import { toDay } from '@/domain/dates';
import { haptics } from '@/lib/haptics';
import { countOf } from '@/lib/labels';
import { account } from '@/state/app';
import { useAccount, useAppState, useNow } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { BottomSheet, Button, IconAvatar, ListItem } from '@/ui/material';
import { PROBLEM, when } from './words';

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
  explain: { marginTop: 8, marginBottom: 12 },
  answers: { marginHorizontal: -16 },
  cancel: { alignItems: 'flex-end', marginTop: 8 },
});
