import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryLines, columns, compared, elapsedUnits, highlights, oldestOffset, periodOf, phrase, type Span } from '@/domain/insights';
import { haptics } from '@/lib/haptics';
import { openPage } from '@/lib/navigation';
import { useData, useNow } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Empty } from '@/ui/Empty';
import { Button, FilterChip, IconButton, ListGroup, SegmentedButton, Subheader, TopAppBar } from '@/ui/material';
import { Swipe } from '@/ui/Swipe';
import { useFabScroll } from '@/ui/useFabScroll';
import { CategoryRow } from './CategoryRow';
import { HighlightRow } from './HighlightRow';
import { HowMuchCard } from './HowMuchCard';
import { KeptCard } from './KeptCard';

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
export function InsightsScreen() {
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

          <HowMuchCard
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

          {data.settings.income && !bar ? <KeptCard p={p} hasAssets={hasAssets} /> : null}
        </ScrollView>
      </Swipe>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  side: { paddingHorizontal: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  empty: { marginTop: 40 },
  more: { alignItems: 'center', marginTop: 8 },
});
