import { StyleSheet } from 'react-native';
import { AppText } from '../components/AppText';
import { Card, IconButton, Subheader } from '../components/material';
import { OptionRow, PageScaffold } from '../components/SettingsBits';
import { Haptics } from '../lib/haptics';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/theme';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Which day a week starts on and which day of the month a "month" starts on. */
export default function TimeFrames() {
  const { m3 } = useTheme();
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);

  const ordinal = (n: number) => (n === 1 ? 'Start of month' : `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 || Math.floor(n / 10) === 1 ? 0 : n % 10]} of month`);

  return (
    <PageScaffold title="Week and month start">
      <Subheader text="Week starts on" />
      {DAYS.map((day, i) => (
        <OptionRow
          key={day}
          label={day}
          selected={settings.firstWeekday === i + 1}
          onPress={() => {
            Haptics.selection();
            update({ firstWeekday: i + 1 });
          }}
        />
      ))}

      <Subheader text="Month starts on" />
      <Card style={styles.stepper}>
        <IconButton icon="remove" onPress={() => update({ firstDayOfMonth: Math.max(1, settings.firstDayOfMonth - 1) })} disabled={settings.firstDayOfMonth <= 1} label="Earlier" tint={m3.onSurface} />
        <AppText variant="titleMedium" color={m3.onSurface}>
          {ordinal(settings.firstDayOfMonth)}
        </AppText>
        <IconButton icon="add" onPress={() => update({ firstDayOfMonth: Math.min(28, settings.firstDayOfMonth + 1) })} disabled={settings.firstDayOfMonth >= 28} label="Later" tint={m3.onSurface} />
      </Card>
      <AppText variant="bodySmall" color={m3.onSurfaceVariant} style={{ marginTop: 12, marginHorizontal: 16 }}>
        Useful if you are paid mid-month. “This month” and new monthly budgets start on this day.
      </AppText>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, padding: 8 },
});
