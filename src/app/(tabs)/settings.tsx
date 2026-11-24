import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { useFabScroll } from '../../lib/useFabScroll';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { ConfirmSheet } from '../../components/Overlays';
import { SettingsRow, SettingsSection } from '../../components/SettingsBits';
import { exportCsv } from '../../lib/csv';
import { useStore, useUi } from '../../lib/store';
import { typeScale } from '../../theme/material';
import { useTheme } from '../../theme/theme';

const THEME_LABEL = { system: 'System', light: 'Light', dark: 'Dark' } as const;
const ENTRY_LABEL = { 1: 'Fill in cents first', 2: 'Type the decimal point' } as const;
const HAPTIC_LABEL = ['Off', 'Subtle', 'Heavy'] as const;

export default function SettingsScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const fabScroll = useFabScroll();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const eraseAll = useStore((s) => s.eraseAll);
  const showToast = useUi((s) => s.showToast);
  const [erasing, setErasing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const share = async () => {
    const { transactions, categories } = useStore.getState();
    if (transactions.length === 0) {
      showToast({ title: 'Nothing to export yet', subtitle: 'Add an entry first', icon: 'information-circle', tone: 'info' }, 2200);
      return;
    }
    try {
      await Share.share({ title: 'Dime export', message: exportCsv(transactions, categories) });
    } catch {
      showToast({ title: 'Couldn’t export your data. Try again.', icon: 'alert-circle', tone: 'error' }, 2200);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <ScrollView {...fabScroll} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        {/* M3 small top app bar */}
        <View style={{ minHeight: 64, justifyContent: 'center' }}>
          <AppText size={typeScale.titleLarge.size} color={m3.onSurface} style={{ marginLeft: 16 }}>
            Settings
          </AppText>
        </View>

        <SettingsSection title="General">
          <SettingsRow icon="pricetags" colour="#F4D35E" label="Categories" onPress={() => router.push('/categories')} />
          <SettingsRow icon="cash" colour="#6FD298" label="Currency" value={settings.currency} onPress={() => router.push('/settings-currency')} />
          <SettingsRow
            icon="keypad"
            colour="#FE6663"
            label="Number entry"
            value={ENTRY_LABEL[settings.numberEntryType]}
            onPress={() => router.push({ pathname: '/settings-choice', params: { key: 'entry' } })}
          />
          <SettingsRow
            icon="wallet"
            colour="#86CD82"
            label="Income tracking"
            toggle={{ value: settings.incomeTracking, onChange: (v) => updateSettings({ incomeTracking: v }) }}
          />
          <SettingsRow icon="calendar" colour="#F39B6D" label="Week and month start" onPress={() => router.push('/settings-timeframes')} />
          <SettingsRow
            icon="finger-print"
            colour="#279AF4"
            label="Haptics"
            value={HAPTIC_LABEL[settings.haptics]}
            onPress={() => router.push({ pathname: '/settings-choice', params: { key: 'haptics' } })}
          />
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
            label="Show cents"
            toggle={{ value: settings.showCents, onChange: (v) => updateSettings({ showCents: v }) }}
          />
          <SettingsRow
            icon="sunny"
            colour="#158AB1"
            label="Upcoming entries"
            value={settings.showUpcoming ? 'Shown' : 'Hidden'}
            onPress={() => router.push({ pathname: '/settings-choice', params: { key: 'upcoming' } })}
          />
          <SettingsRow
            icon="remove-circle"
            colour="#F7717D"
            label="Show + and − signs"
            toggle={{ value: settings.showSign, onChange: (v) => updateSettings({ showSign: v }) }}
          />
          <SettingsRow
            icon="flash"
            colour="#556BF5"
            label="Animated charts"
            toggle={{ value: settings.animatedCharts, onChange: (v) => updateSettings({ animatedCharts: v }) }}
          />
        </SettingsSection>

        <SettingsSection title="Data">
          <SettingsRow icon="share" colour="#B1638B" label="Export data" onPress={share} />
          <SettingsRow icon="trash-bin" colour="#FF78A3" label="Erase data" destructive onPress={() => setErasing(true)} />
        </SettingsSection>

        <SettingsSection title="Account">
          <SettingsRow icon="log-out" colour="#6A7CF9" label="Log out" onPress={() => setLoggingOut(true)} />
        </SettingsSection>

        <View style={{ alignItems: 'center', marginTop: 28, gap: 2 }}>
          <AppText size={typeScale.bodyMedium.size} color={m3.onSurfaceVariant}>
            Version 1.0.0
          </AppText>
          <AppText size={typeScale.bodySmall.size} color={m3.onSurfaceVariant} style={{ textAlign: 'center' }}>
            A React Native port of Dime by Rafael Soh
          </AppText>
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={loggingOut}
        title="Log out?"
        message="You’ll return to the welcome screen. Your entries and budgets stay on this phone."
        confirmLabel="Log out"
        onCancel={() => setLoggingOut(false)}
        onConfirm={() => {
          setLoggingOut(false);
          // The Log tab watches this flag and opens the welcome screen again.
          updateSettings({ welcomed: false });
        }}
      />
      <ConfirmSheet
        visible={erasing}
        title="Erase all entries and budgets?"
        message="Your categories are kept. You can’t undo this."
        confirmLabel="Erase data"
        onCancel={() => setErasing(false)}
        onConfirm={() => {
          eraseAll();
          setErasing(false);
          showToast({ title: 'Data erased', icon: 'checkmark-circle', tone: 'success' }, 2200);
        }}
      />
    </View>
  );
}
