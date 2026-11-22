import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { BigAmount } from '../../components/Bits';
import { BarChart } from '../../components/Charts';
import { PeriodSwiper } from '../../components/PeriodSwiper';
import { Popover, PopoverItem, useAnchor, anchorProps } from '../../components/Overlays';
import {
  categoryBreakdown,
  getInsights,
  getInsightsSummary,
  insightsEnd,
  insightsLabel,
  insightsStart,
  netChange,
  type InsightsType,
} from '../../lib/calc';
import { dayLabel, monthName } from '../../lib/dates';
import { currencySymbol, fmtBlock, fmtFull, fmtSmart } from '../../lib/format';
import { Haptics } from '../../lib/haptics';
import { useStore } from '../../lib/store';
import { useNow } from '../../lib/useNow';
import { useTheme, withAlpha } from '../../theme/theme';

const TYPES: { type: InsightsType; label: string }[] = [
  { type: 1, label: 'week' },
  { type: 2, label: 'month' },
  { type: 3, label: 'year' },
];

const WEEK_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function InsightsScreen() {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);
  const typeMenu = useAnchor();

  const [type, setType] = useState<InsightsType>(1);
  const [offset, setOffset] = useState(0);
  const [income, setIncome] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const nowMs = useNow();
  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const start = useMemo(() => insightsStart(type, offset, settings, now), [type, offset, settings, now]);

  // Without a filter the chart and list show spending, as in Dime.
  const showIncome = filtering && income;
  const data = useMemo(() => getInsights(transactions, type, start, showIncome, now), [transactions, type, start, showIncome, now]);
  const summary = useMemo(() => getInsightsSummary(transactions, type, start, now), [transactions, type, start, now]);
  const change = useMemo(() => netChange(transactions, type, offset, settings, now), [transactions, type, offset, settings, now]);
  const shares = useMemo(() => categoryBreakdown(transactions, categories, type, start, showIncome), [transactions, categories, type, start, showIncome]);

  const fadeFrom = useMemo(() => {
    const idx = data.dates.findIndex((d) => d.getTime() > nowMs);
    return idx === -1 ? data.dates.length : idx;
  }, [data.dates, nowMs]);

  const labels = useMemo(() => {
    if (type === 1) return data.dates.map((d, i) => ({ index: i, text: WEEK_LETTERS[d.getDay()] }));
    if (type === 2) return data.dates.map((_, i) => i).filter((i) => i % 7 === 0).map((i) => ({ index: i, text: String(i + 1) }));
    return data.dates.map((_, i) => ({ index: i, text: MONTH_LETTERS[i] }));
  }, [type, data.dates]);

  // The oldest period worth showing is the one holding the first transaction (Swift: "That's all, buddy.").
  const minOffset = useMemo(() => {
    if (transactions.length === 0) return 0;
    const earliest = transactions.reduce((m, t) => Math.min(m, t.date), Infinity);
    let o = 0;
    while (o > -600 && insightsEnd(type, insightsStart(type, o - 1, settings, now)).getTime() > earliest) o--;
    return o;
  }, [transactions, type, settings, now]);

  const go = (delta: number) => {
    Haptics.selection();
    setOffset((o) => Math.max(minOffset, Math.min(0, o + delta)));
    setSelectedBar(null);
    setSelectedCategory(null);
  };

  const neighbour = (delta: number) => {
    const d = insightsStart(type, offset + delta, settings, now);
    if (type === 1) return `${d.getDate()} ${monthName(d)}`.toUpperCase();
    if (type === 2) return `${monthName(d)} ${String(d.getFullYear()).slice(-2)}`.toUpperCase();
    return String(d.getFullYear());
  };

  // Swiping is Swift's gesture: it already settles the haptic and the slide, so the period is changed silently.
  const swipeTo = (delta: -1 | 1) => {
    setOffset((o) => Math.max(minOffset, Math.min(0, o + delta)));
    setSelectedBar(null);
    setSelectedCategory(null);
  };

  const sym = currencySymbol(settings.currency);
  const netSigned = summary.positive ? summary.net : -summary.net;
  const selectedShare = shares.find((s) => s.category.id === selectedCategory);
  const barAmount = selectedBar !== null ? data.values[selectedBar] : null;
  const barLabel =
    selectedBar !== null
      ? type === 3
        ? `${monthName(data.dates[selectedBar])} ${data.dates[selectedBar].getFullYear()}`
        : dayLabel(data.dates[selectedBar])
      : '';

  let sideLabel: string;
  let sideValue: number;
  if (selectedShare) {
    sideLabel = selectedShare.category.name;
    sideValue = selectedShare.amount;
  } else if (barAmount !== null) {
    sideLabel = barLabel;
    sideValue = barAmount;
  } else if (filtering) {
    sideLabel = type === 3 ? (income ? 'Income/Mth' : 'Spent/Mth') : income ? 'Income/Day' : 'Spent/Day';
    sideValue = data.average;
  } else {
    sideLabel = type === 3 ? 'AVG/MTH' : 'AVG/DAY';
    sideValue = summary.average;
  }

  const block = (isIncome: boolean, amount: number) => {
    const selected = filtering && income === isIncome;
    const tint = isIncome ? c.IncomeGreen : c.AlertRed;
    return (
      <Pressable
        key={String(isIncome)}
        onPress={() => {
          Haptics.selection();
          setSelectedBar(null);
          setSelectedCategory(null);
          if (filtering && income === isIncome) setFiltering(false);
          else {
            setIncome(isIncome);
            setFiltering(true);
          }
        }}
        style={[
          styles.block,
          { backgroundColor: dark ? c.TertiaryBackground : c.SecondaryBackground },
          selected && { borderWidth: 1.3, borderColor: withAlpha(c.SubtitleText, 0.7) },
        ]}
      >
        <View style={[styles.blockIcon, { backgroundColor: withAlpha(tint, 0.23) }]}>
          <Ionicons name={isIncome ? 'arrow-up' : 'arrow-down'} size={18} color={tint} style={{ transform: [{ rotate: isIncome ? '45deg' : '-45deg' }] }} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText size={13} weight="semibold" color="SubtitleText" numberOfLines={1}>
            {isIncome ? 'Income' : 'Expenses'}
          </AppText>
          <AppText size={20} weight="medium" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {sym}
            {fmtBlock(amount, settings.showCents)}
          </AppText>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.PrimaryBackground }}>
      <PeriodSwiper canGoBack={offset > minOffset} canGoForward={offset < 0} backLabel={neighbour(-1)} forwardLabel={neighbour(1)} onChange={swipeTo}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 25, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <AppText size={36} weight="bold">
            Insights
          </AppText>
          <View {...anchorProps(typeMenu)}>
            <Pressable onPress={typeMenu.open} style={[styles.typePill, { backgroundColor: c.Outline }]} accessibilityLabel="Change period">
              <AppText size={19} weight="medium">
                {TYPES.find((t) => t.type === type)?.label}
              </AppText>
              <Ionicons name="chevron-expand" size={16} color={c.DarkIcon} />
            </Pressable>
          </View>
        </View>

        <Popover visible={typeMenu.visible} anchor={typeMenu.anchor} onClose={typeMenu.close} align="right" width={170}>
          {TYPES.map((t) => (
            <PopoverItem
              key={t.type}
              label={t.label}
              selected={type === t.type}
              onPress={() => {
                Haptics.selection();
                typeMenu.close();
                setType(t.type);
                setOffset(0);
                setSelectedBar(null);
                setSelectedCategory(null);
              }}
            />
          ))}
        </Popover>

        {/* Period total */}
        <View style={styles.totalRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={() => go(-1)} hitSlop={10} accessibilityLabel="Previous period">
                <Ionicons name="chevron-back" size={18} color={c.SubtitleText} />
              </Pressable>
              <AppText size={22} weight="semibold" color="SubtitleText">
                {insightsLabel(type, start)}
              </AppText>
              {offset < 0 ? (
                <Pressable onPress={() => go(1)} hitSlop={10} accessibilityLabel="Next period">
                  <Ionicons name="chevron-forward" size={18} color={c.SubtitleText} />
                </Pressable>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <BigAmount
                value={fmtSmart(summary.net, settings.showCents)}
                sign={settings.showSign ? (netSigned >= 0 ? '+' : '-') : ''}
                currency={settings.currency}
                size={44}
                align="flex-start"
              />
              {change !== null ? (
                <View style={[styles.badge, { backgroundColor: withAlpha(change >= 0 ? c.IncomeGreen : c.AlertRed, 0.2) }]}>
                  <AppText size={16} weight="semibold" style={{ color: change >= 0 ? c.IncomeGreen : c.AlertRed }}>
                    {change >= 0 ? '+' : '-'}
                    {Math.min(Math.round(Math.abs(change)), 999)}%
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>

          <Pressable style={{ alignItems: 'flex-end', maxWidth: '45%' }} onPress={() => { setSelectedBar(null); setSelectedCategory(null); }}>
            <AppText size={18} weight="semibold" color="SubtitleText" numberOfLines={1}>
              {sideLabel}
            </AppText>
            <BigAmount value={fmtSmart(sideValue, settings.showCents)} currency={settings.currency} size={44} align="flex-end" />
          </Pressable>
        </View>

        {settings.incomeTracking ? (
          <View style={styles.blocks}>
            {block(true, summary.income)}
            {block(false, summary.spent)}
          </View>
        ) : null}

        {/* Chart */}
        <View style={{ marginTop: 22 }}>
          <BarChart
            values={data.values}
            labels={labels}
            fadeFrom={offset === 0 ? fadeFrom : data.values.length}
            average={selectedBar === null ? data.average : undefined}
            height={150}
            activeIndex={selectedBar ?? undefined}
            animate={settings.animatedCharts}
            replayKey={`${type}-${offset}-${income ? 'in' : 'out'}`}
          />
          {/* Tap targets over the bars to pick a day. */}
          <View style={[styles.hitRow, { height: 150 }]}>
            {data.values.map((_, i) => (
              <Pressable
                key={i}
                style={{ flex: 1 }}
                onPress={() => {
                  Haptics.selection();
                  setSelectedCategory(null);
                  setSelectedBar(selectedBar === i ? null : i);
                }}
                accessibilityLabel={`Select ${i + 1}`}
              />
            ))}
          </View>
        </View>

        {/* Categories */}
        <View style={{ marginTop: 34 }}>
          <AppText size={22} weight="semibold" color="SubtitleText">
            Categories
          </AppText>
          {shares.length === 0 ? (
            <AppText size={18} weight="medium" color="SubtitleText" style={{ marginTop: 14, opacity: 0.8 }}>
              Nothing logged in {insightsLabel(type, start)} yet.
            </AppText>
          ) : (
            <>
              <View style={styles.colourBar}>
                {shares.map((s) => (
                  <View key={s.category.id} style={{ flex: Math.max(s.percent, 2), height: 17, borderRadius: 9, backgroundColor: s.category.colour, opacity: selectedCategory && selectedCategory !== s.category.id ? 0.3 : 1 }} />
                ))}
              </View>
              {shares.map((s) => (
                <Pressable
                  key={s.category.id}
                  onPress={() => {
                    Haptics.selection();
                    setSelectedBar(null);
                    setSelectedCategory(selectedCategory === s.category.id ? null : s.category.id);
                  }}
                  style={styles.catRow}
                >
                  <AppText size={28}>{s.category.emoji}</AppText>
                  <AppText size={24} weight="semibold" style={{ flex: 1, marginLeft: 12 }} numberOfLines={1}>
                    {s.category.name}
                  </AppText>
                  <AppText size={20} weight="semibold" color="SubtitleText" style={{ marginRight: 10 }}>
                    {sym}
                    {s.amount < 100 ? fmtFull(s.amount) : fmtSmart(s.amount, false)}
                  </AppText>
                  <View style={[styles.pct, { backgroundColor: withAlpha(s.category.colour, 0.2), minWidth: 62 }]}>
                    <AppText size={20} weight="semibold" style={{ color: s.category.colour }}>
                      {Math.round(s.percent)}%
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </>
          )}
        </View>
      </ScrollView>
      </PeriodSwiper>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 11 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9 },
  blocks: { flexDirection: 'row', gap: 11, marginTop: 12 },
  block: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 8, borderRadius: 12 },
  blockIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  hitRow: { position: 'absolute', left: 38, right: 0, top: 0, flexDirection: 'row' },
  colourBar: { flexDirection: 'row', gap: 5, marginTop: 12, marginBottom: 18 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  pct: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center' },
});

