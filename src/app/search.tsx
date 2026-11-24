import { goBack } from '../lib/nav';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { useDeleteFlow } from '../components/DeleteFlow';
import { Icon } from '../components/Icon';
import { IconButton, SearchBar } from '../components/m3';
import { TransactionRow } from '../components/TransactionRow';
import { groupByDay } from '../lib/calc';
import { dayLabel, isSameDay } from '../lib/dates';
import { currencySymbol, fmtFull } from '../lib/format';
import { useStore } from '../lib/store';
import { useNow } from '../lib/useNow';
import type { Transaction } from '../lib/types';
import { shape, typeScale } from '../theme/material';
import { useTheme } from '../theme/theme';

type Row = { kind: 'header'; key: string; label: string; net: number } | { kind: 'item'; key: string; t: Transaction };

/** Full-screen search over notes, category names and amounts, as an M3 search view. */
export default function SearchScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const currency = useStore((s) => s.settings.currency);
  const showSign = useStore((s) => s.settings.showSign);
  const { ask, remove, element } = useDeleteFlow();
  const [query, setQuery] = useState('');
  const now = useNow();

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return [];
    const hits = transactions.filter((t) => {
      const cat = categories.find((x) => x.id === t.categoryId)?.name.toLowerCase() ?? '';
      return t.note.toLowerCase().includes(q) || cat.includes(q) || String(t.amount).startsWith(q);
    });
    const out: Row[] = [];
    for (const g of groupByDay(hits)) {
      out.push({ kind: 'header', key: `h-${g.day}`, label: isSameDay(g.day, now) ? 'Today' : dayLabel(new Date(g.day)), net: g.net });
      g.items.forEach((t) => out.push({ kind: 'item', key: t.id, t }));
    }
    return out;
  }, [query, transactions, categories, now]);

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface, paddingTop: insets.top + 12 }}>
      <SearchBar
        autoFocus
        grow
        value={query}
        onChangeText={setQuery}
        placeholder="Search entries"
        leading={<IconButton icon="arrow-back" onPress={() => goBack()} label="Back" tint={m3.onSurface} />}
      />

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        keyboardShouldPersistTaps="handled"
        style={{ marginTop: 8 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={
          query.trim() !== '' ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: m3.surfaceContainerHigh }]}>
                <Icon name="search" size={40} color={m3.onSurfaceVariant} />
              </View>
              <AppText size={typeScale.headlineSmall.size} color={m3.onSurface} style={{ marginTop: 20 }}>
                No entries found
              </AppText>
              <AppText size={typeScale.bodyLarge.size} color={m3.onSurfaceVariant} style={{ marginTop: 8 }}>
                Try another note, category or amount.
              </AppText>
            </View>
          ) : undefined
        }
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <View style={styles.subheader}>
              <AppText size={typeScale.labelLarge.size} weight="semibold" color={m3.onSurfaceVariant}>
                {item.label}
              </AppText>
              <AppText size={typeScale.labelLarge.size} weight="semibold" color={m3.onSurfaceVariant}>
                {showSign ? (item.net >= 0 ? '+' : '-') : ''}
                {currencySymbol(currency)}
                {fmtFull(Math.abs(item.net))}
              </AppText>
            </View>
          ) : (
            <TransactionRow transaction={item.t} onDelete={ask} onQuickDelete={remove} />
          )
        }
      />
      {element}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingTop: 90, paddingHorizontal: 32 },
  emptyIcon: { width: 88, height: 88, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  subheader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
});
