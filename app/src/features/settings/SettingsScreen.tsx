import Constants from 'expo-constants';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shareCsv } from '@/data/exporting';
import { toDay } from '@/domain/dates';
import { toCsv } from '@/domain/entries';
import { symbolOf } from '@/domain/money';
import { AccountSection } from '@/features/account/AccountSection';
import { haptics } from '@/lib/haptics';
import { countOf, HAPTICS, labelIn, THEMES } from '@/lib/labels';
import { openPage } from '@/lib/navigation';
import { messages, store } from '@/state/app';
import { useAccount, useAppState, useSettings } from '@/state/hooks';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Avatar } from '@/ui/Avatar';
import { Confirm } from '@/ui/Confirm';
import { Logotype } from '@/ui/Logo';
import { Subheader } from '@/ui/material';
import { LinkRow, ToggleRow } from '@/ui/SettingsRows';
import { Touch } from '@/ui/Touch';
import { useFabScroll } from '@/ui/useFabScroll';
import { NameSheet } from './NameSheet';

async function exportData() {
  if (store.data.entries.length === 0) return messages.show('Nothing to export yet');
  try {
    if (!(await shareCsv(`Peppercorn ${toDay(Date.now())}.csv`, toCsv(store.data)))) messages.warn('No app can open the file.');
  } catch {
    messages.warn('Couldn’t make the file. Free up some space and try again.');
  }
}

/** The You tab: who you are, how the app works, and your data. */
export function SettingsScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const scroll = useFabScroll();
  const s = useSettings();
  const entries = useAppState((state) => state.data.entries.length);
  const user = useAccount((a) => a.user);
  const [naming, setNaming] = useState(false);
  const [erasing, setErasing] = useState(false);
  const symbol = symbolOf(s.currency);
  const choose = (what: string) => openPage({ pathname: '/choose', params: { what } });

  return (
    <View style={[styles.fill, { backgroundColor: m3.surface }]}>
      <ScrollView {...scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 160 }}>
        <View style={styles.who}>
          <Touch ink={m3.onSurface} radius={shape.large} label={s.name ? `${s.name}, edit your name` : 'Add your name'} onPress={() => setNaming(true)} style={styles.name}>
            <Avatar name={s.name} size={88} />
            <AppText variant="titleLarge" color={s.name ? m3.onSurface : m3.primary} numberOfLines={1}>
              {s.name || 'Add your name'}
            </AppText>
          </Touch>
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
            {user?.email ?? `${countOf(entries, 'entry', 'entries')} on this phone`}
          </AppText>
        </View>

        <Subheader text="General" />
        <LinkRow icon="pricetags" label="Categories" onPress={() => openPage('/categories')} />
        <LinkRow icon="cash" label="Currency" value={symbol === s.currency ? symbol : `${symbol} ${s.currency}`} onPress={() => openPage('/currency')} />
        <LinkRow icon="keypad" label="Number entry" value={s.typing === 'cents' ? 'Cents first' : 'Decimal point'} onPress={() => choose('typing')} />
        <ToggleRow icon="wallet" label="Income tracking" on={s.income} onChange={(income) => store.set({ income })} />
        <LinkRow icon="calendar" label="Week and month start" onPress={() => openPage('/week-month')} />
        <LinkRow icon="finger-print" label="Haptics" value={labelIn(HAPTICS, s.haptics)} onPress={() => choose('haptics')} />

        <Subheader text="Appearance" />
        <LinkRow icon="contrast" label="Theme" value={labelIn(THEMES, s.theme)} onPress={() => choose('theme')} />
        <ToggleRow icon="logo-usd" label="Show cents" on={s.cents} onChange={(cents) => store.set({ cents })} />
        <LinkRow icon="sunny" label="Upcoming entries" value={s.upcoming ? 'Shown' : 'Hidden'} onPress={() => choose('upcoming')} />
        <ToggleRow icon="remove-circle" label="Show + and − signs" on={s.signs} onChange={(signs) => store.set({ signs })} />
        <ToggleRow icon="flash" label="Animated charts" on={s.animated} onChange={(animated) => store.set({ animated })} />

        <Subheader text="Data" />
        <LinkRow icon="share" label="Export data" onPress={exportData} />
        <LinkRow icon="trash-bin" label="Erase data" destructive onPress={() => setErasing(true)} />

        <AccountSection />

        <View style={styles.about}>
          <Logotype height={26} />
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
            Version {Constants.expoConfig?.version ?? ''}
          </AppText>
        </View>
      </ScrollView>

      <NameSheet visible={naming} onClose={() => setNaming(false)} />
      <Confirm
        visible={erasing}
        title="Erase all entries, assets and budgets?"
        message={user ? 'Your categories are kept. They’re erased from your Google Drive too. You can’t undo this.' : 'Your categories are kept. You can’t undo this.'}
        confirm="Erase data"
        onCancel={() => setErasing(false)}
        onConfirm={() => {
          setErasing(false);
          store.erase();
          haptics.done();
          messages.show('Data erased');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  who: { alignItems: 'center', paddingHorizontal: 24 },
  name: { alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 2, borderRadius: shape.large, overflow: 'hidden' },
  about: { alignItems: 'center', gap: 8, marginTop: 28 },
});
