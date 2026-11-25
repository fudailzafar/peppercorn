import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { backKey, digitKey, pointKey, type Key, type Keypad } from '@/domain/keypad';
import { haptics } from '@/lib/haptics';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { Touch } from './Touch';

export const PAD_HEIGHT = 4 * 64 + 3 * 8;

interface Props {
  pad: Keypad;
  onKey: (key: Key) => void;
  onSubmit: () => void;
  /** What the check does, spoken. */
  submitLabel: string;
}

/** Digits, the point and the check, and nothing else. (Filling in cents first needs no point: there it deletes.) */
export function NumberPad({ pad, onKey, onSubmit, submitLabel }: Props) {
  const { m3 } = useTheme();
  const key = (label: string, onPress: () => void, face: ReactNode, strong = false) => (
    <Touch
      key={label}
      label={label}
      ink={strong ? m3.onPrimary : m3.onSurface}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[styles.key, { backgroundColor: strong ? m3.primary : m3.surfaceContainerHigh }]}
    >
      {face}
    </Touch>
  );
  const character = (text: string, label: string, pressed: Key) =>
    key(
      label,
      () => onKey(pressed),
      <AppText variant="headlineLarge" maxFontSizeMultiplier={1.2}>
        {text}
      </AppText>,
    );
  const digit = (n: number) => character(String(n), String(n), digitKey(n));
  return (
    <View style={styles.pad}>
      {[1, 4, 7].map((first) => (
        <View key={first} style={styles.row}>
          {[first, first + 1, first + 2].map(digit)}
        </View>
      ))}
      <View style={styles.row}>
        {pad.typing === 'cents' ? key('Delete digit', () => onKey(backKey), <Icon name="backspace-outline" size={28} color={m3.onSurface} />) : character('.', 'Decimal point', pointKey)}
        {digit(0)}
        {key(submitLabel, onSubmit, <Icon name="checkmark" size={30} color={m3.onPrimary} />, true)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: 8, paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 8 },
  key: { flex: 1, height: 64, borderRadius: shape.large, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
