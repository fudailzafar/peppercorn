import { useLocalSearchParams } from 'expo-router';
import { OptionRow, PageScaffold } from '../components/SettingsBits';
import { AppText } from '../components/AppText';
import { Haptics } from '../lib/haptics';
import { typeScale } from '../theme/material';
import { useTheme } from '../theme/theme';
import { useStore } from '../lib/store';

interface Option {
  label: string;
  caption?: string;
  selected: boolean;
  apply: () => void;
}

/** One screen for Dime's simple "pick one" settings (theme, haptics, number entry, upcoming logs). */
export default function SettingsChoice() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { m3 } = useTheme();
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);

  let title = '';
  let footer = '';
  let options: Option[] = [];

  if (key === 'theme') {
    title = 'Theme';
    options = (['system', 'light', 'dark'] as const).map((v) => ({
      label: v[0].toUpperCase() + v.slice(1),
      selected: settings.theme === v,
      apply: () => update({ theme: v }),
    }));
  } else if (key === 'haptics') {
    title = 'Haptics';
    options = ([0, 1, 2] as const).map((v) => ({
      label: ['Off', 'Subtle', 'Heavy'][v],
      selected: settings.haptics === v,
      apply: () => {
        update({ haptics: v });
        setTimeout(() => Haptics.light(), 50);
      },
    }));
  } else if (key === 'entry') {
    title = 'Number Entry';
    footer = 'Type 1 shifts digits in as cents. Type 2 uses a decimal point.';
    options = ([1, 2] as const).map((v) => ({
      label: `Type ${v}`,
      caption: v === 1 ? 'Digits enter as cents: 1 2 5 → 1.25' : 'Decimal point: 1 2 . 5 → 12.5',
      selected: settings.numberEntryType === v,
      apply: () => update({ numberEntryType: v }),
    }));
  } else if (key === 'upcoming') {
    title = 'Upcoming Logs';
    footer = 'Recurring logs show their next date at the top of your Log.';
    options = [
      { label: 'Shown', selected: settings.showUpcoming, apply: () => update({ showUpcoming: true }) },
      { label: 'Hidden', selected: !settings.showUpcoming, apply: () => update({ showUpcoming: false }) },
    ];
  }

  return (
    <PageScaffold title={title}>
      {options.map((o) => (
        <OptionRow
          key={o.label}
          label={o.label}
          caption={o.caption}
          selected={o.selected}
          onPress={() => {
            Haptics.selection();
            o.apply();
          }}
        />
      ))}
      {footer ? (
        <AppText size={typeScale.bodySmall.size} color={m3.onSurfaceVariant} style={{ marginTop: 12, marginHorizontal: 16 }}>
          {footer}
        </AppText>
      ) : null}
    </PageScaffold>
  );
}
