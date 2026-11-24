import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { Haptics } from '../lib/haptics';
import { pressDelete, pressDigit, pressDot, type EntryType } from '../lib/amount';
import { shape } from '../theme/material';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { StateLayer } from './m3';

interface Props {
  raw: string;
  onChange: (raw: string) => void;
  entryType: EntryType;
  onSubmit: () => void;
  /** What the check key does, for screen readers. */
  submitLabel: string;
  /** Digits allowed after the point (3 for grams). */
  decimals?: number;
}

const ROWS = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

/** A Material 3 keypad: tonal 16dp keys with ripples, and a filled primary confirm key. */
export function NumberPad({ raw, onChange, entryType, onSubmit, submitLabel, decimals = 2 }: Props) {
  const { m3 } = useTheme();

  const key = (content: React.ReactNode, onPress: () => void, tone: 'tonal' | 'primary', label: string) => {
    const bg = tone === 'primary' ? m3.primary : m3.surfaceContainerHigh;
    const ink = tone === 'primary' ? m3.onPrimary : m3.onSurface;
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityLabel={label}
        android_ripple={{ color: `${ink}1F` }}
        onPress={() => {
          Haptics.light();
          onPress();
        }}
        style={[styles.key, { backgroundColor: bg }]}
      >
        {({ pressed }) => (
          <>
            <StateLayer pressed={pressed} color={ink} />
            {content}
          </>
        )}
      </Pressable>
    );
  };

  const digit = (n: number) =>
    key(
      <AppText size={32} weight="regular" color={m3.onSurface}>
        {n}
      </AppText>,
      () => onChange(pressDigit(raw, n, entryType, decimals)),
      'tonal',
      String(n),
    );

  return (
    <View style={styles.pad}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map(digit)}
        </View>
      ))}
      <View style={styles.row}>
        {entryType === 1
          ? key(<Icon name="backspace-outline" size={28} color={m3.onSurface} />, () => onChange(pressDelete(raw)), 'tonal', 'Delete')
          : key(
              <AppText size={32} weight="regular" color={m3.onSurface}>
                .
              </AppText>,
              () => onChange(pressDot(raw, entryType)),
              'tonal',
              'Decimal point',
            )}
        {digit(0)}
        {key(<Icon name="checkmark" size={30} color={m3.onPrimary} />, onSubmit, 'primary', submitLabel)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: 8, paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 8 },
  key: { flex: 1, height: 64, borderRadius: shape.large, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  checkBox: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
