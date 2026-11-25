import { StyleSheet, View } from 'react-native';
import { haptics } from '@/lib/haptics';
import { store } from '@/state/app';
import { useSettings } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Card, IconButton, Subheader } from '@/ui/material';
import { Page } from '@/ui/Page';
import { RadioRow } from '@/ui/SettingsRows';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Every month has this one. */
const LAST = 28;

/** "25th of month" */
function dayLabel(n: number): string {
  if (n === 1) return 'Start of month';
  const ending = n > 10 && n < 14 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${ending} of month`;
}

/** Which day a week starts on, and which day of the month a "month" does. */
export function WeekAndMonthScreen() {
  const { m3 } = useTheme();
  const settings = useSettings();
  const move = (by: number) => {
    haptics.select();
    store.set({ monthStart: settings.monthStart + by });
  };
  return (
    <Page title="Week and month start">
      <Subheader text="Week starts on" />
      {DAYS.map((day, weekStart) => (
        <RadioRow key={day} label={day} selected={settings.weekStart === weekStart} onPress={() => store.set({ weekStart })} />
      ))}
      <Subheader text="Month starts on" />
      <Card style={styles.card}>
        <View style={styles.stepper}>
          <IconButton icon="remove" label="Earlier" tint={m3.onSurface} disabled={settings.monthStart <= 1} onPress={() => move(-1)} />
          <AppText variant="titleMedium" accessibilityLiveRegion="polite">
            {dayLabel(settings.monthStart)}
          </AppText>
          <IconButton icon="add" label="Later" tint={m3.onSurface} disabled={settings.monthStart >= LAST} onPress={() => move(1)} />
        </View>
      </Card>
      <AppText variant="bodySmall" color={m3.onSurfaceVariant} style={styles.note}>
        Useful if you are paid mid-month. “This month” and new monthly budgets start on this day.
      </AppText>
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, padding: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  note: { paddingHorizontal: 16, paddingVertical: 12 },
});
