import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { Card, ListItem, SearchBar, Subheader } from '../components/material';
import { PageScaffold } from '../components/SettingsBits';
import { CURRENCIES } from '../lib/currencies';
import { currencySymbol } from '../lib/format';
import { Haptics } from '../lib/haptics';
import { goBack } from '../lib/nav';
import { useStore } from '../lib/store';
import { shape } from '../theme/material';
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
            <Card style={[styles.current, { backgroundColor: m3.primaryContainer }]}>
              <SymbolCircle code={selected.code} background={m3.primary} ink={m3.onPrimary} />
              <View style={{ flex: 1 }}>
                <AppText variant="titleMedium" color={m3.onPrimaryContainer} numberOfLines={1}>
                  {selected.name}
                </AppText>
                <AppText variant="bodyMedium" color={m3.onPrimaryContainer}>
                  {selected.code}
                </AppText>
              </View>
              <Icon name="checkmark-circle" size={24} color={m3.onPrimaryContainer} />
            </Card>
          )
        }
        ListEmptyComponent={
          <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={{ textAlign: 'center', marginTop: 48 }}>
            No currencies match “{query.trim()}”
          </AppText>
        }
        renderSectionHeader={({ section }) => <Subheader text={section.title} />}
        renderItem={({ item }) => (
          <ListItem
            headline={item.name}
            leading={<SymbolCircle code={item.code} background={m3.surfaceContainerHigh} ink={m3.onSurface} />}
            trailingText={item.code}
            trailing={item.code === current ? <Icon name="checkmark" size={24} color={m3.primary} /> : undefined}
            onPress={() => choose(item.code)}
            role="radio"
            checked={item.code === current}
            accessibilityLabel={`${item.name}, ${item.code}`}
          />
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
  current: { flexDirection: 'row', alignItems: 'center', gap: 16, marginHorizontal: 16, padding: 16 },
  circle: { width: 40, height: 40, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
});
