import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import type { Settings } from '@/domain/model';
import { haptics } from '@/lib/haptics';
import { HAPTICS, THEMES } from '@/lib/labels';
import { store } from '@/state/app';
import { useSettings } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Page } from '@/ui/Page';
import { RadioRow } from '@/ui/SettingsRows';

interface Option {
  label: string;
  caption?: string;
  set: Partial<Settings>;
}

interface Question {
  title: string;
  options: readonly Option[];
  note?: string;
}

const QUESTIONS: Record<string, Question> = {
  theme: { title: 'Theme', options: THEMES.map(([theme, label]) => ({ label, set: { theme } })) },
  haptics: { title: 'Haptics', options: HAPTICS.map(([level, label]) => ({ label, set: { haptics: level } })) },
  typing: {
    title: 'Number entry',
    options: [
      { label: 'Fill in cents first', caption: '1 2 5 becomes 1.25', set: { typing: 'cents' } },
      { label: 'Type the decimal point', caption: '1 2 . 5 becomes 12.5', set: { typing: 'point' } },
    ],
  },
  upcoming: {
    title: 'Upcoming entries',
    options: [
      { label: 'Shown', set: { upcoming: true } },
      { label: 'Hidden', set: { upcoming: false } },
    ],
    note: 'Repeating entries show their next date at the top of your history.',
  },
};

/** A setting with a few answers. */
export function ChoiceScreen() {
  const { what = 'theme' } = useLocalSearchParams<{ what: string }>();
  const { m3 } = useTheme();
  const settings = useSettings();
  const { title, options, note } = QUESTIONS[what] ?? QUESTIONS.theme;
  const chosen = ({ set }: Option) => Object.entries(set).every(([key, value]) => settings[key as keyof Settings] === value);
  return (
    <Page title={title}>
      {options.map((option) => (
        <RadioRow
          key={option.label}
          label={option.label}
          caption={option.caption}
          selected={chosen(option)}
          onPress={() => {
            store.set(option.set);
            // How it feels now.
            if (what === 'haptics') haptics.tap();
          }}
        />
      ))}
      {note ? (
        <AppText variant="bodySmall" color={m3.onSurfaceVariant} style={styles.note}>
          {note}
        </AppText>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({ note: { padding: 16 } });
