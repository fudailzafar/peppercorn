import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CURRENCIES, type Currency } from '@/domain/currencies';
import { symbolOf } from '@/domain/money';
import { haptics } from '@/lib/haptics';
import { goBack } from '@/lib/navigation';
import { store } from '@/state/app';
import { useSettings } from '@/state/hooks';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Icon } from '@/ui/Icon';
import { Card, ListItem, SearchBar, Subheader } from '@/ui/material';
import { Page } from '@/ui/Page';

const COMMON = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'SGD', 'AUD'];

function choose(code: string) {
  haptics.select();
  store.set({ currency: code });
  goBack();
}

const keyOf = (c: Currency) => c.code;
const heading = ({ section }: { section: { title: string } }) => <Subheader text={section.title} />;

/** The chosen currency, then common ones, then all by name. */
export function CurrencyScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const { currency } = useSettings();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const sections = useMemo(() => {
    if (q !== '') {
      const found = CURRENCIES.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || symbolOf(c.code).toLowerCase() === q);
      return found.length > 0 ? [{ title: 'Results', data: found }] : [];
    }
    const common = COMMON.flatMap((code) => CURRENCIES.filter((c) => c.code === code && code !== currency));
    const rest = CURRENCIES.filter((c) => c.code !== currency && !COMMON.includes(c.code));
    return [
      { title: 'Common', data: common },
      { title: 'All currencies', data: rest },
    ];
  }, [q, currency]);

  const row = useCallback(
    ({ item }: { item: Currency }) => (
      <ListItem
        headline={item.name}
        leading={<SymbolCircle code={item.code} />}
        trailingText={item.code}
        trailing={item.code === currency ? <Icon name="checkmark" color={m3.primary} /> : undefined}
        accessibilityLabel={`${item.name}, ${item.code}`}
        onPress={() => choose(item.code)}
      />
    ),
    [currency, m3],
  );

  return (
    <Page title="Currency" scroll={false}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search currencies" />
      <SectionList
        sections={sections}
        keyExtractor={keyOf}
        renderItem={row}
        renderSectionHeader={heading}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={q === '' ? <Chosen code={currency} /> : undefined}
        ListEmptyComponent={
          <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={styles.none}>
            No currencies match “{query.trim()}”
          </AppText>
        }
      />
    </Page>
  );
}

function Chosen({ code }: { code: string }) {
  const { m3 } = useTheme();
  const name = CURRENCIES.find((c) => c.code === code)?.name ?? code;
  return (
    <Card style={[styles.chosen, { backgroundColor: m3.primaryContainer }]}>
      <SymbolCircle code={code} strong />
      <View style={styles.fill}>
        <AppText variant="titleMedium" color={m3.onPrimaryContainer} numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="bodyMedium" color={m3.onPrimaryContainer}>
          {code}
        </AppText>
      </View>
      <Icon name="checkmark-circle" color={m3.onPrimaryContainer} />
    </Card>
  );
}

/** The symbol, smaller the longer it is, so every name lines up. */
function SymbolCircle({ code, strong = false }: { code: string; strong?: boolean }) {
  const { m3 } = useTheme();
  const symbol = symbolOf(code);
  return (
    <View style={[styles.circle, { backgroundColor: strong ? m3.primary : m3.surfaceContainerHigh }]}>
      <AppText size={[20, 20, 16, 13][symbol.length] ?? 11} weight="medium" color={strong ? m3.onPrimary : m3.onSurface} numberOfLines={1} allowFontScaling={false}>
        {symbol}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { flex: 1, marginTop: 12 },
  none: { textAlign: 'center', marginTop: 48 },
  chosen: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, marginHorizontal: 16 },
  circle: { width: 40, height: 40, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
});
