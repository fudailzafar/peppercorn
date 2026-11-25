import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { BigAmount } from '../../components/BigAmount';
import { ColumnChart } from '../../components/ColumnChart';
import { Empty } from '../../components/Empty';
import { CategoryRow, Comparison } from '../../components/InsightBits';
import { Button, Card, EmojiAvatar, FilterChip, IconAvatar, IconButton, LinearProgress, ListGroup, ListItem, SegmentedButton, Subheader, TopAppBar } from '../../components/material';
import { Swipe } from '../../components/Swipe';
import { useData, useMoney, useNow } from '../../data/hooks';
import { shortLabel, toDay } from '../../domain/dates';
import { against, categoryLines, columns, compared, elapsedUnits, highlights, oldestOffset, periodOf, phrase, type Column, type Compared, type Highlight, type Period, type Span } from '../../domain/insights';
import { haptics } from '../../hooks/haptics';
import { openPage } from '../../hooks/nav';
import { useFabScroll } from '../../hooks/useFabScroll';
import { useTheme } from '../../theme/theme';

const SPANS: readonly Span[] = ['week', 'month', 'year'];
const SPAN_NAMES = ['Week', 'Month', 'Year'] as const;
/** Categories shown before "Show all". */
const FEW = 5;

interface Shown {
  span: Span;
  offset: number;
  income: boolean;
  /** Assets left out. */
  everyday: boolean;
  picked: number | null;
  all: boolean;
}

/** Answers, in the order people ask: how much, is that a lot, what stands out, where it went, and what's left of what came in. */
export default function Insights() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const scroll = useFabScroll();
  const data = useData();
  const now = useNow();
  const [view, setView] = useState<Shown>({ span: 'month', offset: 0, income: false, everyday: false, picked: null, all: false });
  const { span, offset, picked } = view;

  // Nothing to switch back with once income tracking is off.
  const income = view.income && data.settings.income;
  const p = useMemo(() => periodOf(span, offset, now, data.settings), [span, offset, now, data.settings]);
  // One gold purchase can dwarf a month of everyday spending, so it can be left out. Home's totals always include it.
  const hasAssets = !income && data.entries.some((e) => e.asset && e.date >= p.from && e.date < p.until);
  const without = hasAssets && view.everyday;
  const counted = useMemo(() => (without ? data.entries.filter((e) => !e.asset) : data.entries), [without, data.entries]);
  const bars = useMemo(() => columns(counted, p, income, now), [counted, p, income, now]);
  const bar = picked === null ? undefined : bars[picked];
  const sums = compared(counted, p, income);
  const lines = categoryLines(data, counted, p, income, bar);
  // Always from everything: budgets count assets, so a forecast without them would mislead.
  const found = bar ? [] : highlights(data, p, income, now);
  const oldest = oldestOffset(data, span, now);

  const change = (to: Partial<Shown>) => {
    haptics.select();
    setView((v) => ({ ...v, picked: null, all: false, ...to }));
  };
  const move = (by: number) => change({ offset: Math.min(0, Math.max(oldest, offset + by)) });
  const openCategory = (id: string) => openPage({ pathname: '/insight-category', params: { id, span, offset: String(offset), income: income ? '1' : '0' } });

  const nothing = sums.now === 0;
  const title = bar ? `, ${bar.name}` : '';
  return (
    <View style={[styles.fill, { backgroundColor: m3.surface }]}>
      <Swipe canGoBack={offset > oldest} canGoForward={offset < 0} onChange={move}>
        <ScrollView {...scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 160 }}>
          <TopAppBar title="Insights" inset={false} />
          <View style={styles.side}>
            <SegmentedButton fullWidth options={SPAN_NAMES} index={SPANS.indexOf(span)} onChange={(i) => change({ span: SPANS[i], offset: 0 })} />
          </View>
          <View style={styles.stepper}>
            <IconButton icon="chevron-back" label={`Previous ${span}`} disabled={offset <= oldest} onPress={() => move(-1)} />
            <AppText variant="titleMedium" accessibilityLiveRegion="polite">
              {p.label}
            </AppText>
            <IconButton icon="chevron-forward" label={`Next ${span}`} disabled={offset >= 0} onPress={() => move(1)} />
          </View>

          <HowMuch
            p={p}
            bars={bars}
            picked={bar ? picked : null}
            sums={sums}
            income={income}
            without={without}
            average={sums.now / elapsedUnits(p, now)}
            onPick={(i) => change({ picked: i === picked ? null : i, all: view.all })}
            chips={
              data.settings.income || hasAssets ? (
                <View style={styles.chips}>
                  {data.settings.income ? (
                    <>
                      <FilterChip label="Spent" selected={!income} onPress={() => change({ income: false })} />
                      <FilterChip label="Earned" selected={income} onPress={() => change({ income: true })} />
                    </>
                  ) : null}
                  {hasAssets ? <FilterChip label="No assets" accessibilityLabel="Leave out assets" selected={without} onPress={() => change({ everyday: !view.everyday })} /> : null}
                </View>
              ) : null
            }
          />

          {nothing ? <Empty icon="insights" title={`Nothing ${income ? 'earned' : 'spent'} ${phrase(p)}`} text="Add an entry and it will show up here." style={styles.empty} /> : null}

          {found.length > 0 ? (
            <>
              <Subheader text="What stands out" />
              <ListGroup>
                {found.map((h, i) => (
                  <HighlightRow key={i} h={h} onCategory={openCategory} />
                ))}
              </ListGroup>
            </>
          ) : null}

          {lines.length > 0 ? (
            <>
              <Subheader text={(income ? 'Where it came from' : 'Where it went') + title} />
              <ListGroup>
                {(view.all ? lines : lines.slice(0, FEW)).map((line) => (
                  <CategoryRow key={line.category.id} line={line} biggest={lines[0].amount} compare={!bar && sums.before > 0} income={income} onPress={() => openCategory(line.category.id)} />
                ))}
              </ListGroup>
              {lines.length > FEW ? (
                <View style={styles.more}>
                  <Button variant="text" icon={view.all ? 'chevron-up' : 'chevron-down'} label={view.all ? 'Show fewer' : `Show all ${lines.length} categories`} onPress={() => setView((v) => ({ ...v, all: !v.all }))} />
                </View>
              ) : null}
            </>
          ) : null}

          {data.settings.income && !bar ? <Kept p={p} hasAssets={hasAssets} /> : null}
        </ScrollView>
      </Swipe>
    </View>
  );
}

interface HowMuchProps {
  p: Period;
  bars: readonly Column[];
  picked: number | null;
  sums: Compared;
  income: boolean;
  without: boolean;
  /** A day, or a month of a year. */
  average: number;
  onPick: (index: number) => void;
  chips: React.ReactNode;
}

/** How much, and is that a lot? */
function HowMuch({ p, bars, picked, sums, income, without, average, onPick, chips }: HowMuchProps) {
  const { m3 } = useTheme();
  const { code, brief, briefDigits } = useMoney();
  const bar = picked === null ? undefined : bars[picked];
  const some = sums.now > 0;
  return (
    <Card hero style={styles.card}>
      {chips}
      <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
        {income ? 'Earned' : 'Spent'} {bar ? bar.name : phrase(p)}
        {without ? ', without assets' : ''}
      </AppText>
      <View style={styles.gap}>
        <BigAmount digits={briefDigits(bar ? bar.value : sums.now)} currency={code} size={44} income={income && some} />
      </View>
      <View style={styles.comparison}>
        {!bar ? (
          <Comparison {...sums} income={income} against={against(p)} />
        ) : some ? (
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
            {Math.round((bar.value / sums.now) * 100)}% of what you {income ? 'earned' : 'spent'} {phrase(p)}
          </AppText>
        ) : null}
      </View>
      <ColumnChart
        bars={bars}
        average={some ? (p.span === 'month' ? average * 7 : average) : undefined}
        averageLabel={some && !bar ? `Average ${brief(average)} a ${p.span === 'year' ? 'month' : 'day'}` : undefined}
        picked={picked}
        onPick={onPick}
        format={brief}
        replay={`${p.span} ${p.offset} ${income}`}
      />
      {bar && picked !== null ? (
        <View style={styles.back}>
          <Button variant="text" icon="close" label={`Back to the whole ${p.span}`} onPress={() => onPick(picked)} />
        </View>
      ) : null}
    </Card>
  );
}

/** What's left of what came in? */
function Kept({ p, hasAssets }: { p: Period; hasAssets: boolean }) {
  const { m3 } = useTheme();
  const { brief } = useMoney();
  const { entries } = useData();
  const spent = compared(entries, p, false).now;
  const earned = compared(entries, p, true).now;
  if (earned <= 0) return null;
  const kept = earned - spent;
  return (
    <>
      <Subheader text="Earned and spent" />
      <Card style={styles.kept}>
        <AppText variant="titleMedium">{kept >= 0 ? `You kept ${brief(kept)} of ${brief(earned)}` : `You spent ${brief(kept)} more than you earned`}</AppText>
        <LinearProgress fraction={spent / earned} color={kept >= 0 ? m3.primary : m3.error} height={12} />
        <View style={styles.sides}>
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
            {brief(spent)} spent{hasAssets ? ', with assets' : ''}
          </AppText>
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
            {brief(earned)} earned
          </AppText>
        </View>
      </Card>
    </>
  );
}

/** One thing worth noticing, leading to where it can be looked into. */
function HighlightRow({ h, onCategory }: { h: Highlight; onCategory: (id: string) => void }) {
  const { brief } = useMoney();
  const today = toDay(useNow());
  switch (h.kind) {
    case 'assets':
      return <ListItem leading={<IconAvatar icon="assets" />} headline={`${brief(h.amount)} went into assets`} supporting="Gold, silver and funds: still yours" chevron onPress={() => router.navigate('/portfolio')} />;
    case 'forecast': {
      const over = h.budget === null ? 0 : h.amount - h.budget;
      const supporting = h.budget === null ? 'By the end of the month' : `${brief(over)} ${over > 0 ? 'over' : 'inside'} your budget`;
      return <ListItem leading={<IconAvatar icon="calendar" />} headline={`On pace for ${brief(h.amount)}`} supporting={supporting} chevron onPress={() => router.navigate('/budget')} />;
    }
    case 'change': {
      const way = h.amount > h.before ? 'up' : 'down';
      const { emoji, colour, name, id } = h.category;
      return <ListItem leading={<EmojiAvatar emoji={emoji} colour={colour} />} headline={`${name} is ${way} ${brief(h.amount - h.before)}`} supporting={`${brief(h.amount)}, ${way} from ${brief(h.before)}`} chevron onPress={() => onCategory(id)} />;
    }
    case 'biggest':
      return (
        <ListItem
          leading={<IconAvatar icon="arrow-up" />}
          headline={`Biggest: ${h.entry.note}, ${brief(h.entry.amount)}`}
          supporting={shortLabel(toDay(h.entry.date), today)}
          chevron
          onPress={() => openPage({ pathname: '/entry', params: { id: h.entry.id } })}
        />
      );
    case 'often':
      return <ListItem leading={<IconAvatar icon="repeat" />} headline={`${h.note}, ${h.times} times`} supporting={`${brief(h.amount)} in all`} chevron onPress={() => openPage({ pathname: '/search', params: { q: h.note } })} />;
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  side: { paddingHorizontal: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 },
  card: { marginHorizontal: 16, marginTop: 4, padding: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  gap: { marginTop: 4 },
  comparison: { minHeight: 24, justifyContent: 'center', marginTop: 4, marginBottom: 16 },
  back: { alignItems: 'flex-start', marginTop: 4 },
  empty: { marginTop: 40 },
  more: { alignItems: 'center', marginTop: 8 },
  kept: { marginHorizontal: 16, padding: 16, gap: 12 },
  sides: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
