import { View } from 'react-native';
import { Icon } from '../components/Icon';
import { AppText } from '../components/AppText';
import { CircleButton } from '../components/Bits';
import { OptionRow, PageScaffold } from '../components/SettingsBits';
import { Haptics } from '../lib/haptics';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/theme';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Which day a week starts on and which day of the month a "month" starts on. */
export default function TimeFrames() {
  const { c } = useTheme();
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);

  const ordinal = (n: number) => (n === 1 ? 'Start of month' : `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 || Math.floor(n / 10) === 1 ? 0 : n % 10]} of month`);

  return (
    <PageScaffold title="Time Frames">
      <AppText size={17} weight="semibold" color="SubtitleText" style={{ marginLeft: 6, marginBottom: 8 }}>
        WEEK STARTS ON
      </AppText>
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

      <AppText size={17} weight="semibold" color="SubtitleText" style={{ marginLeft: 6, marginTop: 18, marginBottom: 8 }}>
        MONTH STARTS ON
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.Settings, padding: 14, borderRadius: 16 }}>
        <CircleButton onPress={() => update({ firstDayOfMonth: Math.max(1, settings.firstDayOfMonth - 1) })} label="Earlier">
          <Icon name="remove" size={22} color={c.DarkIcon} />
        </CircleButton>
        <AppText size={22} weight="semibold">
          {ordinal(settings.firstDayOfMonth)}
        </AppText>
        <CircleButton onPress={() => update({ firstDayOfMonth: Math.min(28, settings.firstDayOfMonth + 1) })} label="Later">
          <Icon name="add" size={22} color={c.DarkIcon} />
        </CircleButton>
      </View>
      <AppText size={15} weight="medium" color="SubtitleText" style={{ marginTop: 10, marginLeft: 6 }}>
        Useful if you are paid mid-month. “This month” on the Log and new monthly budgets start on this day.
      </AppText>
    </PageScaffold>
  );
}
