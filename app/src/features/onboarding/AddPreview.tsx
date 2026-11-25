import { StyleSheet, View } from 'react-native';
import { useSettings } from '@/state/hooks';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { BigAmount } from '@/ui/BigAmount';
import { Icon } from '@/ui/Icon';
import { FilterChip, SegmentedButton } from '@/ui/material';
import { PreviewFrame, Surface } from './PreviewFrame';

const nothing = () => {};

/** The entry screen: type, amount, note and category, and the message after saving. */
export function AddPreview() {
  const { m3 } = useTheme();
  const { currency } = useSettings();
  return (
    <PreviewFrame>
      <Surface hero>
        <View style={styles.parts}>
          <SegmentedButton fullWidth options={['Expense', 'Income']} index={0} onChange={nothing} />
          <BigAmount digits="180" currency={currency} size={52} centred />
          <View style={[styles.note, { backgroundColor: m3.surfaceContainerHigh }]}>
            <Icon name="create-outline" size={20} color={m3.onSurfaceVariant} />
            <AppText variant="bodyLarge">Lunch with Sara</AppText>
          </View>
          <View style={styles.chips}>
            <FilterChip emoji="🍔" label="Food" selected onPress={nothing} />
            <FilterChip emoji="🚌" label="Transport" selected={false} onPress={nothing} />
          </View>
        </View>
      </Surface>
      <View style={[styles.snackbar, { backgroundColor: m3.inverseSurface }]}>
        <AppText variant="bodyMedium" color={m3.inverseOnSurface} style={styles.fill}>
          Expense saved
        </AppText>
        <AppText variant="labelLarge" color={m3.inversePrimary}>
          Undo
        </AppText>
      </View>
    </PreviewFrame>
  );
}

const styles = StyleSheet.create({
  parts: { gap: 16 },
  fill: { flex: 1 },
  note: { height: 48, borderRadius: shape.full, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  snackbar: { minHeight: 48, borderRadius: shape.extraSmall, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
});
