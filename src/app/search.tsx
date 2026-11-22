import { goBack } from '../lib/nav';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { useDeleteFlow } from '../components/DeleteFlow';
import { TransactionRow } from '../components/TransactionRow';
import { groupByDay } from '../lib/calc';
import { dayLabel, isSameDay } from '../lib/dates';
import { currencySymbol, fmtFull } from '../lib/format';
import { useStore } from '../lib/store';
import { useNow } from '../lib/useNow';
import type { Transaction } from '../lib/types';
import { fontFamily, useTheme } from '../theme/theme';

type Row = { kind: 'header'; key: string; label: string; net: number } | { kind: 'item'; key: string; t: Transaction };

/** Full-screen search over notes and category names. */
export default function SearchScreen() {
  const { c } = useTheme();
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
      return t.note.toLowerCase().includes(q) || cat.includes(q);
    });
    const out: Row[] = [];
    for (const g of groupByDay(hits)) {
      out.push({ kind: 'header', key: `h-${g.day}`, label: isSameDay(g.day, now) ? 'TODAY' : dayLabel(new Date(g.day)).toUpperCase(), net: g.net });
      g.items.forEach((t) => out.push({ kind: 'item', key: t.id, t }));
    }
    return out;
  }, [query, transactions, categories, now]);

  return (
    <View style={{ flex: 1, backgroundColor: c.PrimaryBackground, paddingTop: insets.top + 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 6 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.SecondaryBackground, borderRadius: 14, paddingHorizontal: 14 }}>
          <Ionicons name="search" size={20} color={c.SubtitleText} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search your log"
            placeholderTextColor={c.SubtitleText}
            returnKeyType="search"
            autoCorrect={false}
            style={{ flex: 1, fontSize: 20, paddingVertical: 12, color: c.PrimaryText, fontFamily: fontFamily.medium }}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear">
              <Ionicons name="close-circle" size={20} color={c.SubtitleText} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => goBack()} hitSlop={10}>
          <AppText size={19} weight="semibold">
            Cancel
          </AppText>
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 25, paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={
          query.trim() !== '' ? (
            <View style={{ alignItems: 'center', paddingTop: 90 }}>
              <AppText size={56}>📭</AppText>
              <AppText size={22} weight="medium" style={{ marginTop: 10 }}>
                No entries found.
              </AppText>
              <AppText size={18} weight="medium" color="SubtitleText">
                Try a different search query!
              </AppText>
            </View>
          ) : undefined
        }
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <View style={{ marginTop: 18, marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6 }}>
                <AppText size={20} weight="semibold" color="SubtitleText">
                  {item.label}
                </AppText>
                <AppText size={20} weight="semibold" color="SubtitleText">
                  {showSign ? (item.net >= 0 ? '+' : '-') : ''}
                  {currencySymbol(currency)}
                  {fmtFull(Math.abs(item.net))}
                </AppText>
              </View>
              <View style={{ height: 2, borderRadius: 1, backgroundColor: c.Outline }} />
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
