import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Often } from '@/domain/entries';
import type { RepeatUnit } from '@/domain/model';
import { haptics } from '@/lib/haptics';
import { OFTEN } from '@/lib/labels';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { BottomSheet, Button, IconButton, SegmentedButton } from '@/ui/material';
import { Menu, type MenuItem } from '@/ui/Menu';

const UNITS: readonly RepeatUnit[] = ['day', 'week', 'month'];
const MOST = 99;

/** A button that opens the ways to repeat. */
export function RepeatMenu({ often, onChange, children }: { often: Often | null; onChange: (often: Often | null) => void; children: (open: () => void) => ReactNode }) {
  const insets = useSafeAreaInsets();
  const [custom, setCustom] = useState(false);
  const simple = UNITS.map((unit): MenuItem => ({ label: OFTEN[unit], selected: often?.unit === unit && often.every === 1, onPress: () => onChange({ unit, every: 1 }) }));
  const items: MenuItem[] = [{ label: 'Don’t repeat', selected: often === null, onPress: () => onChange(null) }, ...simple, { label: 'Custom', selected: (often?.every ?? 1) > 1, onPress: () => setCustom(true) }];
  return (
    <>
      <Menu items={items}>{children}</Menu>
      <BottomSheet visible={custom} onClose={() => setCustom(false)} bottomInset={insets.bottom}>
        {/* Starts from what is set each time it opens. */}
        <Custom
          key={String(custom)}
          often={often}
          onDone={(chosen) => {
            setCustom(false);
            onChange(chosen);
          }}
        />
      </BottomSheet>
    </>
  );
}

/** Every so many days, weeks or months. */
function Custom({ often, onDone }: { often: Often | null; onDone: (often: Often) => void }) {
  const { m3 } = useTheme();
  const [unit, setUnit] = useState<RepeatUnit>(often?.unit ?? 'week');
  const [every, setEvery] = useState(often?.every ?? 1);
  const step = (by: number) => {
    haptics.select();
    setEvery((n) => Math.min(MOST, Math.max(1, n + by)));
  };
  return (
    <View style={styles.sheet}>
      <AppText variant="titleLarge">Repeat every</AppText>
      <View style={styles.counter}>
        <IconButton icon="remove" label="Fewer" tint={m3.onSurface} disabled={every <= 1} onPress={() => step(-1)} />
        <AppText variant="displaySmall" accessibilityLiveRegion="polite">
          {every}
        </AppText>
        <IconButton icon="add" label="More" tint={m3.onSurface} disabled={every >= MOST} onPress={() => step(1)} />
      </View>
      <SegmentedButton fullWidth options={UNITS.map((u) => `${u[0].toUpperCase()}${u.slice(1)}${every === 1 ? '' : 's'}`)} index={UNITS.indexOf(unit)} onChange={(i) => setUnit(UNITS[i])} />
      <View style={styles.done}>
        <Button large label="Set repeat" onPress={() => onDone({ unit, every })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: 8 },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  done: { marginTop: 16 },
});
