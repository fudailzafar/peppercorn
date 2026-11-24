import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { SearchBar, StateLayer } from '../components/m3';
import { PageScaffold } from '../components/SettingsBits';
import { CURRENCIES } from '../lib/currencies';
import { currencySymbol } from '../lib/format';
import { Haptics } from '../lib/haptics';
import { goBack } from '../lib/nav';
import { useStore } from '../lib/store';
import { radius, typeScale } from '../theme/material';
import { useTheme } from '../theme/theme';

const COMMON = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'SGD', 'AUD'];

type Item = (typeof CURRENCIES)[number];

const find = (code: string): Item => CURRENCIES.find((c) => c.code === code) ?? { code, name: code };

/** Pick a currency: the current one on top, then common ones, then everything by name. */
export default function CurrencyScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const current = useStore((s) => s.settings.currency);
  const update = useStore((s) => s.updateSettings);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const sections = useMemo(() => {
    if (q) {
      const data = CURRENCIES.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || currencySymbol(c.code).toLowerCase() === q);
      return data.length > 0 ? [{ title: 'Results', data }] : [];
    }
    return [
      { title: 'Common', data: COMMON.filter((c) => c !== current).map(find) },
      { title: 'All currencies', data: CURRENCIES.filter((c) => c.code !== current && !COMMON.includes(c.code)) },
    ];
  }, [q, current]);

  const choose = (code: string) => {
    Haptics.selection();
    update({ currency: code });
    goBack();
  };
  const selected = find(current);

  return (
    <PageScaffold title="Currency" scroll={false}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search currencies" autoCapitalize="none" />
      <SectionList
        sections={sections}
        keyExtractor={(c) => c.code}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        initialNumToRender={16}
        style={{ marginTop: 12 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          q ? undefined : (
            <View style={[styles.current, { backgroundColor: m3.primaryContainer }]} accessible accessibilityLabel={`Current currency: ${selected.name}`}>
              <SymbolCircle code={selected.code} background={m3.primary} ink={m3.onPrimary} />
              <View style={{ flex: 1 }}>
                <AppText size={typeScale.titleMedium.size} weight="semibold" color={m3.onPrimaryContainer} numberOfLines={1}>
                  {selected.name}
                </AppText>
                <AppText size={typeScale.bodyMedium.size} color={m3.onPrimaryContainer}>
                  {selected.code}
                </AppText>
              </View>
              <Icon name="checkmark-circle" size={24} color={m3.onPrimaryContainer} />
            </View>
          )
        }
        ListEmptyComponent={
          <AppText size={typeScale.bodyLarge.size} color={m3.onSurfaceVariant} style={{ textAlign: 'center', marginTop: 48 }}>
            No currencies match “{query.trim()}”
          </AppText>
        }
        renderSectionHeader={({ section }) => (
          <AppText size={typeScale.labelLarge.size} weight="semibold" color={m3.onSurfaceVariant} style={styles.header}>
            {section.title}
          </AppText>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => choose(item.code)}
            accessibilityRole="radio"
            accessibilityState={{ selected: item.code === current }}
            accessibilityLabel={`${item.name}, ${item.code}`}
            android_ripple={{ color: `${m3.onSurface}1F` }}
            style={styles.row}
          >
            {({ pressed }) => (
              <>
                <StateLayer pressed={pressed} color={m3.onSurface} />
                <SymbolCircle code={item.code} background={m3.surfaceContainerHigh} ink={m3.onSurface} />
                <AppText size={typeScale.bodyLarge.size} color={m3.onSurface} numberOfLines={1} style={{ flex: 1 }}>
                  {item.name}
                </AppText>
                {item.code === current ? <Icon name="checkmark" size={22} color={m3.primary} /> : null}
                <AppText size={typeScale.bodyMedium.size} color={m3.onSurfaceVariant}>
                  {item.code}
                </AppText>
              </>
            )}
          </Pressable>
        )}
      />
    </PageScaffold>
  );
}

/** The symbol in a fixed circle, set smaller the longer it is, so every name lines up. */
function SymbolCircle({ code, background, ink }: { code: string; background: string; ink: string }) {
  const symbol = currencySymbol(code);
  const size = symbol.length === 1 ? 20 : symbol.length === 2 ? 16 : symbol.length === 3 ? 13 : 11;
  return (
    <View style={[styles.circle, { backgroundColor: background }]}>
      <AppText size={size} weight="semibold" color={ink} numberOfLines={1} style={{ includeFontPadding: false }}>
        {symbol}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  current: { flexDirection: 'row', alignItems: 'center', gap: 16, marginHorizontal: 16, padding: 16, borderRadius: radius.card },
  header: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, overflow: 'hidden' },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
