import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFabScroll } from '../../lib/useFabScroll';
import { Icon } from '../../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { BigAmount } from '../../components/Bits';
import { IconButton, SegmentedButton, StateLayer } from '../../components/m3';
import { BarChart } from '../../components/Charts';
import { PeriodSwiper } from '../../components/PeriodSwiper';
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
import { shape, typeScale } from '../../theme/material';
import { useTheme, withAlpha } from '../../theme/theme';

const TYPES: { type: InsightsType; label: string }[] = [
  { type: 1, label: 'week' },
  { type: 2, label: 'month' },
  { type: 3, label: 'year' },
];

const WEEK_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function InsightsScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const fabScroll = useFabScroll();
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);

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
    sideLabel = `${income ? 'Income' : 'Spent'} per ${type === 3 ? 'month' : 'day'}`;
    sideValue = data.average;
  } else {
    sideLabel = type === 3 ? 'Average per month' : 'Average per day';
    sideValue = summary.average;
  }

  // Income / Expenses cards double as filters: a selected card gets a 2dp primary outline.
  const block = (isIncome: boolean, amount: number) => {
    const selected = filtering && income === isIncome;
    // Only income is tinted (green). Spending stays neutral: red is kept for errors and going over a budget.
    const container = isIncome ? m3.successContainer : m3.surfaceContainerHigh;
    const ink = isIncome ? m3.success : m3.onSurfaceVariant;
    return (
      <Pressable
        key={String(isIncome)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        android_ripple={{ color: `${m3.onSurface}1F` }}
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
        style={[styles.block, { backgroundColor: m3.surfaceContainerHigh, borderColor: selected ? m3.primary : 'transparent' }]}
      >
        {({ pressed }) => (
          <>
            <StateLayer pressed={pressed} color={m3.onSurface} />
            <View style={[styles.blockIcon, { backgroundColor: container }]}>
              <Icon name={isIncome ? 'arrow-up' : 'arrow-down'} size={20} color={ink} style={{ transform: [{ rotate: isIncome ? '45deg' : '-45deg' }] }} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText size={typeScale.labelMedium.size} weight="semibold" color={m3.onSurfaceVariant} numberOfLines={1} style={{ letterSpacing: typeScale.labelMedium.tracking }}>
                {isIncome ? 'Income' : 'Expenses'}
              </AppText>
              <AppText size={typeScale.titleMedium.size} weight="semibold" color={m3.onSurface} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {sym}
                {fmtBlock(amount, settings.showCents)}
              </AppText>
            </View>
          </>
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <PeriodSwiper canGoBack={offset > minOffset} canGoForward={offset < 0} backLabel={neighbour(-1)} forwardLabel={neighbour(1)} onChange={swipeTo}>
        <ScrollView {...fabScroll} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
          {/* M3 small top app bar */}
          <View style={styles.topBar}>
            <AppText size={typeScale.titleLarge.size} color={m3.onSurface} style={{ marginLeft: 16 }}>
              Insights
            </AppText>
          </View>

          {/* Period type: a three-option segmented button */}
          <View style={styles.padded}>
            <SegmentedButton
              fullWidth
              options={TYPES.map((t) => t.label[0].toUpperCase() + t.label.slice(1))}
              index={TYPES.findIndex((t) => t.type === type)}
              onChange={(i) => {
                Haptics.selection();
                setType(TYPES[i].type);
                setOffset(0);
                setSelectedBar(null);
                setSelectedCategory(null);
              }}
            />
          </View>

          {/* Period navigator */}
          <View style={styles.navigator}>
            <IconButton icon="chevron-back" onPress={() => go(-1)} label="Previous period" />
            <AppText size={typeScale.titleMedium.size} weight="semibold" color={m3.onSurface} style={{ letterSpacing: typeScale.titleMedium.tracking }}>
              {insightsLabel(type, start)}
            </AppText>
            <View style={{ opacity: offset < 0 ? 1 : 0.38 }} pointerEvents={offset < 0 ? 'auto' : 'none'}>
              <IconButton icon="chevron-forward" onPress={() => go(1)} label="Next period" />
            </View>
          </View>

          {/* Summary card: the period total with its change, and the average beside it */}
          <View style={[styles.summary, { backgroundColor: m3.surfaceContainerLow, borderColor: m3.outlineVariant }]}>
            <View style={{ flex: 1 }}>
              <AppText size={typeScale.labelLarge.size} weight="semibold" color={m3.onSurfaceVariant} style={{ letterSpacing: typeScale.labelLarge.tracking }}>
                Net
              </AppText>
              <BigAmount
                value={fmtSmart(summary.net, settings.showCents)}
                sign={settings.showSign ? (netSigned >= 0 ? '+' : '-') : ''}
                currency={settings.currency}
                size={36}
                align="flex-start"
              />
              {change !== null ? (
                <View style={[styles.badge, { backgroundColor: change >= 0 ? m3.successContainer : m3.surfaceContainerHigh }]}>
                  <Icon name={change >= 0 ? 'trending-up' : 'trending-down'} size={16} color={change >= 0 ? m3.success : m3.onSurfaceVariant} />
                  <AppText size={typeScale.labelMedium.size} weight="semibold" color={change >= 0 ? m3.success : m3.onSurfaceVariant}>
                    {Math.min(Math.round(Math.abs(change)), 999)}% vs last {TYPES.find((t) => t.type === type)?.label}
                  </AppText>
                </View>
              ) : null}
            </View>
            <Pressable
              style={{ alignItems: 'flex-end', maxWidth: '45%' }}
              onPress={() => {
                setSelectedBar(null);
                setSelectedCategory(null);
              }}
            >
              <AppText size={typeScale.labelLarge.size} weight="semibold" color={m3.onSurfaceVariant} numberOfLines={1} style={{ letterSpacing: typeScale.labelLarge.tracking }}>
                {sideLabel}
              </AppText>
              <BigAmount value={fmtSmart(sideValue, settings.showCents)} currency={settings.currency} size={28} align="flex-end" />
            </Pressable>
          </View>

          {settings.incomeTracking ? (
            <View style={[styles.blocks, styles.padded]}>
              {block(true, summary.income)}
              {block(false, summary.spent)}
            </View>
          ) : null}

          {/* Chart */}
          <View style={[styles.padded, { marginTop: 24 }]}>
            <BarChart
              values={data.values}
              labels={labels}
              fadeFrom={offset === 0 ? fadeFrom : data.values.length}
              average={selectedBar === null ? data.average : undefined}
              height={160}
              activeIndex={selectedBar ?? undefined}
              animate={settings.animatedCharts}
              replayKey={`${type}-${offset}-${income ? 'in' : 'out'}`}
            />
            {/* Tap targets over the bars to pick a day. */}
            <View style={[styles.hitRow, { height: 160 }]}>
              {data.values.map((_, i) => (
                <Pressable
                  key={i}
                  style={{ flex: 1 }}
                  onPress={() => {
                    Haptics.selection();
                    setSelectedCategory(null);
                    setSelectedBar(selectedBar === i ? null : i);
                  }}
                  accessibilityLabel={type === 3 ? `${monthName(data.dates[i])} ${data.dates[i].getFullYear()}` : dayLabel(data.dates[i])}
                />
              ))}
            </View>
          </View>

          {/* Categories: a stacked share bar, then M3 list items */}
          <View style={{ marginTop: 32 }}>
            <AppText size={typeScale.titleMedium.size} weight="semibold" color={m3.onSurfaceVariant} style={[styles.padded, { letterSpacing: typeScale.titleMedium.tracking }]}>
              Categories
            </AppText>
            {shares.length === 0 ? (
              <AppText size={typeScale.bodyLarge.size} color={m3.onSurfaceVariant} style={[styles.padded, { marginTop: 12 }]}>
                Nothing logged in {insightsLabel(type, start)} yet.
              </AppText>
            ) : (
              <>
                <View style={[styles.colourBar, styles.padded]}>
                  {shares.map((s) => (
                    <View key={s.category.id} style={{ flex: Math.max(s.percent, 2), height: 12, borderRadius: shape.full, backgroundColor: s.category.colour, opacity: selectedCategory && selectedCategory !== s.category.id ? 0.3 : 1 }} />
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
                    android_ripple={{ color: `${m3.onSurface}1F` }}
                    style={styles.catRow}
                  >
                    {({ pressed }) => (
                      <>
                        <StateLayer pressed={pressed || selectedCategory === s.category.id} color={m3.onSurface} />
                        <View style={[styles.avatar, { backgroundColor: withAlpha(s.category.colour, 0.3) }]}>
                          <AppText size={20} style={{ includeFontPadding: false }}>
                            {s.category.emoji}
                          </AppText>
                        </View>
                        <AppText size={typeScale.bodyLarge.size} color={m3.onSurface} style={{ flex: 1, marginLeft: 16, letterSpacing: typeScale.bodyLarge.tracking }} numberOfLines={1}>
                          {s.category.name}
                        </AppText>
                        <AppText size={typeScale.bodyMedium.size} color={m3.onSurfaceVariant} style={{ marginRight: 12 }}>
                          {sym}
                          {s.amount < 100 ? fmtFull(s.amount) : fmtSmart(s.amount, false)}
                        </AppText>
                        <View style={[styles.pct, { backgroundColor: withAlpha(s.category.colour, 0.2) }]}>
                          <AppText size={typeScale.labelLarge.size} weight="semibold" style={{ color: s.category.colour }}>
                            {Math.round(s.percent)}%
                          </AppText>
                        </View>
                      </>
                    )}
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
  topBar: { minHeight: 64, justifyContent: 'center' },
  padded: { paddingHorizontal: 16 },
  navigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 8 },
  summary: { marginHorizontal: 16, marginTop: 4, padding: 20, borderRadius: shape.extraLarge, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: shape.small, marginTop: 8 },
  blocks: { flexDirection: 'row', gap: 12, marginTop: 12 },
  block: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: shape.large, borderWidth: 2, overflow: 'hidden' },
  blockIcon: { width: 40, height: 40, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  hitRow: { position: 'absolute', left: 54, right: 16, top: 0, flexDirection: 'row' },
  colourBar: { flexDirection: 'row', gap: 4, marginTop: 12, marginBottom: 8 },
  catRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, overflow: 'hidden' },
  avatar: { width: 40, height: 40, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  pct: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: shape.small, alignItems: 'center', minWidth: 52 },
});
