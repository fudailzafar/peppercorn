import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useFabScroll } from '../../lib/useFabScroll';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { BottomSheet, FilledButton, PillField } from '../../components/m3';
import { ConfirmSheet } from '../../components/Overlays';
import { SettingsRow, SettingsSection } from '../../components/SettingsBits';
import { currencySymbol } from '../../lib/format';
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
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const entryCount = useStore((s) => s.transactions.length);
  const openName = () => {
    setName(settings.profileName);
    setNaming(true);
  };

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
        {/* Profile */}
        <View style={{ alignItems: 'center', paddingTop: 24, paddingHorizontal: 24 }}>
          <Pressable onPress={openName} accessibilityRole="button" accessibilityLabel={settings.profileName ? 'Edit your name' : 'Add your name'} style={{ alignItems: 'center' }}>
            <Avatar name={settings.profileName} size={88} />
            <AppText size={typeScale.titleLarge.size} color={settings.profileName ? m3.onSurface : m3.primary} style={{ marginTop: 12 }}>
              {settings.profileName || 'Add your name'}
            </AppText>
          </Pressable>
          <AppText size={typeScale.bodyMedium.size} color={m3.onSurfaceVariant} style={{ marginTop: 2 }}>
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'} on this phone
          </AppText>
        </View>

        <SettingsSection title="General">
          <SettingsRow icon="pricetags" label="Categories" onPress={() => router.push('/categories')} />
          <SettingsRow icon="cash" label="Currency" value={currencySymbol(settings.currency) === settings.currency ? settings.currency : `${currencySymbol(settings.currency)} ${settings.currency}`} onPress={() => router.push('/settings-currency')} />
          <SettingsRow
            icon="keypad"
            label="Number entry"
            value={ENTRY_LABEL[settings.numberEntryType]}
            onPress={() => router.push({ pathname: '/settings-choice', params: { key: 'entry' } })}
          />
          <SettingsRow
            icon="wallet"
            label="Income tracking"
            toggle={{ value: settings.incomeTracking, onChange: (v) => updateSettings({ incomeTracking: v }) }}
          />
          <SettingsRow icon="calendar" label="Week and month start" onPress={() => router.push('/settings-timeframes')} />
          <SettingsRow
            icon="finger-print"
            label="Haptics"
            value={HAPTIC_LABEL[settings.haptics]}
            onPress={() => router.push({ pathname: '/settings-choice', params: { key: 'haptics' } })}
          />
        </SettingsSection>

        <SettingsSection title="Appearance">
          <SettingsRow
            icon="contrast"
            label="Theme"
            value={THEME_LABEL[settings.theme]}
            onPress={() => router.push({ pathname: '/settings-choice', params: { key: 'theme' } })}
          />
          <SettingsRow
            icon="logo-usd"
            label="Show cents"
            toggle={{ value: settings.showCents, onChange: (v) => updateSettings({ showCents: v }) }}
          />
          <SettingsRow
            icon="sunny"
            label="Upcoming entries"
            value={settings.showUpcoming ? 'Shown' : 'Hidden'}
            onPress={() => router.push({ pathname: '/settings-choice', params: { key: 'upcoming' } })}
          />
          <SettingsRow
            icon="remove-circle"
            label="Show + and − signs"
            toggle={{ value: settings.showSign, onChange: (v) => updateSettings({ showSign: v }) }}
          />
          <SettingsRow
            icon="flash"
            label="Animated charts"
            toggle={{ value: settings.animatedCharts, onChange: (v) => updateSettings({ animatedCharts: v }) }}
          />
        </SettingsSection>

        <SettingsSection title="Data">
          <SettingsRow icon="share" label="Export data" onPress={share} />
          <SettingsRow icon="trash-bin" label="Erase data" destructive onPress={() => setErasing(true)} />
        </SettingsSection>

        <SettingsSection title="Account">
          <SettingsRow icon="log-out" label="Log out" onPress={() => setLoggingOut(true)} />
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

      <BottomSheet visible={naming} onClose={() => setNaming(false)} bottomInset={insets.bottom}>
        <AppText size={typeScale.titleLarge.size} color={m3.onSurface} style={{ marginBottom: 20 }}>
          Your name
        </AppText>
        <View style={{ gap: 20 }}>
          <PillField icon="person" placeholder="Name" value={name} onChangeText={setName} maxLength={40} autoFocus autoCapitalize="words" returnKeyType="done" />
          <FilledButton
            label="Save name"
            onPress={() => {
              updateSettings({ profileName: name.trim() });
              setNaming(false);
            }}
          />
        </View>
      </BottomSheet>
      <ConfirmSheet
        visible={loggingOut}
        title="Log out?"
        message="You’ll return to the welcome screen. Your entries, assets and budgets stay on this phone."
        confirmLabel="Log out"
        onCancel={() => setLoggingOut(false)}
        onConfirm={() => {
          setLoggingOut(false);
          // The Home tab watches this flag and opens the welcome screen again.
          updateSettings({ welcomed: false });
        }}
      />
      <ConfirmSheet
        visible={erasing}
        title="Erase all entries, assets and budgets?"
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
