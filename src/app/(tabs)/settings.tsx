import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { ConfirmSheet } from '../../components/Overlays';
import { SettingsRow, SettingsSection } from '../../components/SettingsBits';
import { exportCsv } from '../../lib/csv';
import { useStore, useUi } from '../../lib/store';
import { useTheme } from '../../theme/theme';

const THEME_LABEL = { system: 'System', light: 'Light', dark: 'Dark' } as const;
const HAPTIC_LABEL = ['Off', 'Subtle', 'Heavy'] as const;

export default function SettingsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const eraseAll = useStore((s) => s.eraseAll);
  const showToast = useUi((s) => s.showToast);
  const [erasing, setErasing] = useState(false);

  const share = async () => {
    const { transactions, categories } = useStore.getState();
    if (transactions.length === 0) {
      showToast({ title: 'Nothing to export', subtitle: 'Add a log first', icon: 'information-circle', tone: 'info' }, 2200);
      return;
    }
    try {
      await Share.share({ title: 'Dime export', message: exportCsv(transactions, categories) });
    } catch {
      showToast({ title: 'Could not share', icon: 'alert-circle', tone: 'error' }, 2200);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.PrimaryBackground }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <AppText size={36} weight="bold" style={{ marginLeft: 5 }}>
          Settings
        </AppText>

        <SettingsSection title="General">
          <SettingsRow icon="pricetags" colour="#F4D35E" label="Categories" onPress={() => router.push('/categories')} />
          <SettingsRow icon="cash" colour="#6FD298" label="Currency" value={settings.currency} onPress={() => router.push('/settings-currency')} />
          <SettingsRow
            icon="keypad"
            colour="#FE6663"
            label="Number Entry"
            value={`Type ${settings.numberEntryType}`}
            onPress={() => router.push({ pathname: '/settings-choice', params: { key: 'entry' } })}
          />
          <SettingsRow
            icon="wallet"
            colour="#86CD82"
            label="Income Tracking"
            toggle={{ value: settings.incomeTracking, onChange: (v) => updateSettings({ incomeTracking: v }) }}
          />
          <SettingsRow icon="calendar" colour="#F39B6D" label="Time Frames" onPress={() => router.push('/settings-timeframes')} />
        </SettingsSection>

        <SettingsSection title="Appearance">
          <SettingsRow
            icon="contrast"
            colour="#279AF4"
            label="Theme"
            value={THEME_LABEL[settings.theme]}
            onPress={() => router.push({ pathname: '/settings-choice', params: { key: 'theme' } })}
          />
          <SettingsRow
            icon="logo-usd"
            colour="#DF928E"
            label="Display Cents"
            toggle={{ value: settings.showCents, onChange: (v) => updateSettings({ showCents: v }) }}
          />
          <SettingsRow
            icon="sunny"
            colour="#158AB1"
            label="Upcoming Logs"
            value={settings.showUpcoming ? 'Shown' : 'Hidden'}
            onPress={() => router.push({ pathname: '/settings-choice', params: { key: 'upcoming' } })}
          />
          <SettingsRow
            icon="remove-circle"
            colour="#F7717D"
            label="Display +/- Symbol"
            toggle={{ value: settings.showSign, onChange: (v) => updateSettings({ showSign: v }) }}
          />
          <SettingsRow
            icon="flash"
            colour="#556BF5"
            label="Animated Charts"
            toggle={{ value: settings.animatedCharts, onChange: (v) => updateSettings({ animatedCharts: v }) }}
          />
        </SettingsSection>

        <SettingsSection title="Data">
          <SettingsRow icon="share" colour="#B1638B" label="Export Data" onPress={share} />
          <SettingsRow icon="trash-bin" colour="#FF78A3" label="Erase Data" onPress={() => setErasing(true)} />
        </SettingsSection>

        <SettingsSection title="Others">
          <SettingsRow
            icon="finger-print"
            colour="#279AF4"
            label="Haptics"
            value={HAPTIC_LABEL[settings.haptics]}
            onPress={() => router.push({ pathname: '/settings-choice', params: { key: 'haptics' } })}
          />
        </SettingsSection>

        <View style={{ alignItems: 'center', marginTop: 28, gap: 2 }}>
          <AppText size={16} weight="medium" color="SubtitleText">
            Version 1.0.0
          </AppText>
          <AppText size={15} weight="medium" color="SubtitleText" style={{ textAlign: 'center' }}>
            A React Native port of Dime by Rafael Soh
          </AppText>
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={erasing}
        title="Erase all data?"
        message="This deletes every log and budget. It cannot be undone."
        confirmLabel="Erase"
        onCancel={() => setErasing(false)}
        onConfirm={() => {
          eraseAll();
          setErasing(false);
          showToast({ title: 'Data Erased', icon: 'checkmark-circle', tone: 'success' }, 2200);
        }}
      />
    </View>
  );
}
