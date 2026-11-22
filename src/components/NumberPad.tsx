import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Haptics } from '../lib/haptics';
import { pressDelete, pressDigit, pressDot, type EntryType } from '../lib/amount';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { PressScale } from './PressScale';

interface Props {
  raw: string;
  onChange: (raw: string) => void;
  entryType: EntryType;
  onSubmit: () => void;
}

const ROWS = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

/** Dime's custom number pad: soft grey keys and a dark confirm key. */
export function NumberPad({ raw, onChange, entryType, onSubmit }: Props) {
  const { c } = useTheme();

  const key = (content: React.ReactNode, onPress: () => void, style?: object, label?: string) => (
    <PressScale
      key={label}
      accessibilityLabel={label}
      onPress={() => {
        Haptics.light();
        onPress();
      }}
      style={[styles.key, { backgroundColor: c.SecondaryBackground }, style]}
    >
      {content}
    </PressScale>
  );

  const digit = (n: number) =>
    key(
      <AppText size={36} weight="regular">
        {n}
      </AppText>,
      () => onChange(pressDigit(raw, n, entryType)),
      undefined,
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
          ? key(<Ionicons name="backspace" size={30} color={c.LightIcon} />, () => onChange(pressDelete(raw)), { backgroundColor: c.DarkBackground }, 'Delete')
          : key(
              <AppText size={36} weight="regular">
                .
              </AppText>,
              () => onChange(pressDot(raw, entryType)),
              undefined,
              'Decimal point',
            )}
        {digit(0)}
        {key(
          <View style={[styles.checkBox, { backgroundColor: c.LightIcon }]}>
            <Ionicons name="checkmark" size={26} color={c.DarkIcon} />
          </View>,
          onSubmit,
          { backgroundColor: c.DarkBackground },
          'Confirm',
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: 10, paddingHorizontal: 15 },
  row: { flexDirection: 'row', gap: 18 },
  key: { height: 66, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  checkBox: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
