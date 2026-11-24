import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { BigAmount } from '../../components/Bits';
import { ColumnChart } from '../../components/Charts';
import { Icon, type IconName } from '../../components/Icon';
import { CategoryRow, Comparison, useMoney } from '../../components/InsightBits';
import { Button, Card, EmojiAvatar, FilterChip, IconAvatar, IconButton, LinearProgress, ListGroup, ListItem, SegmentedButton, Subheader, TopAppBar } from '../../components/material';
import { PeriodSwiper } from '../../components/PeriodSwiper';
import { insightsEnd, insightsLabel, insightsStart, type InsightsType } from '../../lib/calc';
import { shortDate } from '../../lib/dates';
import { fmtSmart } from '../../lib/format';
import { Haptics } from '../../lib/haptics';
import { categoryLines, columns, elapsedUnits, highlights, period, periodPhrase, total, UNIT, type Highlight } from '../../lib/insights';
import { useStore } from '../../lib/store';
import { useFabScroll } from '../../lib/useFabScroll';
import { useNow } from '../../lib/useNow';
import { shape } from '../../theme/material';
import { useTheme } from '../../theme/theme';

const TYPES: InsightsType[] = [1, 2, 3];
/** Categories shown before "Show all". */
const FEW = 5;

/**
 * Answers, in the order people ask: how much, is that a lot, what stands out, where it went, and what's left of what
 * came in. Anything deeper is one tap away.
 */
export default function InsightsScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const fabScroll = useFabScroll();
  const money = useMoney();
  const everything = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const mainBudget = useStore((s) => s.mainBudget);
  const settings = useStore((s) => s.settings);
  const nowMs = useNow();
  const now = useMemo(() => new Date(nowMs), [nowMs]);

  const [type, setType] = useState<InsightsType>(2);
  const [offset, setOffset] = useState(0);
  const [income, setIncome] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [everyday, setEveryday] = useState(false);

  const p = useMemo(() => period(type, offset, settings, now), [type, offset, settings, now]);
  // One gold purchase can dwarf a month of everyday spending, so it can be left out. Home's totals always include it.
  const hasAssets = !income && everything.some((t) => t.asset && t.date >= p.start.getTime() && t.date < p.until);
  const without = hasAssets && everyday;
  const transactions = useMemo(() => (without ? everything.filter((t) => !t.asset) : everything), [everything, without]);
  const cols = useMemo(() => columns(transactions, type, p, income, now), [transactions, type, p, income, now]);
  const sums = useMemo(() => total(transactions, p, income), [transactions, p, income]);
  const column = picked !== null ? cols[picked] : undefined;
  const lines = useMemo(() => categoryLines(transactions, categories, p, income, column), [transactions, categories, p, income, column]);
  // Always from everything: budgets count assets, so a forecast without them would mislead.
  const notable = useMemo(() => highlights(everything, categories, type, p, income, mainBudget, now), [everything, categories, type, p, income, mainBudget, now]);
  const spent = useMemo(() => total(everything, p, false).now, [everything, p]);
  const earned = useMemo(() => total(everything, p, true).now, [everything, p]);

  // The oldest period worth showing holds the first entry.
  const oldest = useMemo(() => {
    const first = everything.reduce((m, t) => Math.min(m, t.date), Infinity);
    if (first === Infinity) return 0;
    let o = 0;
    while (o > -600 && insightsEnd(type, insightsStart(type, o - 1, settings, now)).getTime() > first) o--;
    return o;
  }, [everything, type, settings, now]);

  const reset = () => {
    setPicked(null);
    setShowAll(false);
  };
  const move = (delta: number) => {
    setOffset((o) => Math.max(oldest, Math.min(0, o + delta)));
    reset();
  };
  const step = (delta: number) => {
    Haptics.selection();
    move(delta);
  };
  const neighbour = (delta: number) => insightsLabel(type, insightsStart(type, offset + delta, settings, now));

  const phrase = periodPhrase(type, offset, p.start);
  const against = offset === 0 ? `this time last ${UNIT[type]}` : `the ${UNIT[type]} before`;
  const average = sums.now / elapsedUnits(type, p, now);
  const perColumn = type === 2 ? average * 7 : average;
  const verb = income ? 'Earned' : 'Spent';
  const shown = showAll ? lines : lines.slice(0, FEW);
  const openCategory = (id: string) => router.push({ pathname: '/insight-category', params: { id, type: String(type), offset: String(offset), ...(income ? { income: '1' } : {}) } });

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <PeriodSwiper canGoBack={offset > oldest} canGoForward={offset < 0} backLabel={neighbour(-1)} forwardLabel={neighbour(1)} onChange={move}>
        <ScrollView {...fabScroll} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
          <TopAppBar title="Insights" inset={false} />
          <View style={{ paddingHorizontal: 16 }}>
            <SegmentedButton
              fullWidth
              options={['Week', 'Month', 'Year']}
              index={TYPES.indexOf(type)}
              onChange={(i) => {
                Haptics.selection();
                setType(TYPES[i]);
                setOffset(0);
                reset();
              }}
            />
          </View>

          <View style={styles.navigator}>
            <IconButton icon="chevron-back" onPress={() => step(-1)} disabled={offset <= oldest} label={`Previous ${UNIT[type]}`} />
            <AppText variant="titleMedium">{insightsLabel(type, p.start)}</AppText>
            <IconButton icon="chevron-forward" onPress={() => step(1)} disabled={offset >= 0} label={`Next ${UNIT[type]}`} />
          </View>

          {/* How much, and is that a lot? */}
          <Card hero style={styles.hero}>
            {settings.incomeTracking || hasAssets ? (
              <View style={styles.chips}>
                {(settings.incomeTracking ? [false, true] : []).map((i) => (
                  <FilterChip
                    key={String(i)}
                    label={i ? 'Earned' : 'Spent'}
                    selected={income === i}
                    onPress={() => {
                      Haptics.selection();
                      setIncome(i);
                      reset();
                    }}
                  />
                ))}
                {hasAssets ? (
                  <FilterChip
                    label="No assets"
                    accessibilityLabel="Leave out assets"
                    selected={without}
                    onPress={() => {
                      Haptics.selection();
                      setEveryday(!everyday);
                      reset();
                    }}
                  />
                ) : null}
              </View>
            ) : null}
            <AppText variant="titleSmall" color={m3.onSurfaceVariant}>
              {column ? `${verb} ${column.name}` : `${verb} ${phrase}`}
              {without ? ', without assets' : ''}
            </AppText>
            <View style={{ marginTop: 4 }}>
              <BigAmount value={fmtSmart(column ? column.value : sums.now, settings.showCents)} currency={settings.currency} size={44} align="flex-start" income={income && sums.now > 0} />
            </View>
            <View style={styles.compare}>
              {column ? (
                <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
                  {sums.now > 0 ? `${Math.round((column.value / sums.now) * 100)}% of what you ${verb.toLowerCase()} ${phrase}` : ''}
                </AppText>
              ) : (
                <Comparison now={sums.now} before={sums.before} income={income} against={against} />
              )}
            </View>
            <View style={{ marginTop: 16 }}>
              <ColumnChart
                columns={cols}
                average={sums.now > 0 ? perColumn : undefined}
                averageLabel={sums.now > 0 && !column ? `Average ${money(average)} a ${type === 3 ? 'month' : 'day'}` : undefined}
                selected={picked}
                onSelect={(i) => {
                  Haptics.selection();
                  setPicked(picked === i ? null : i);
                }}
                format={money}
                replayKey={`${type}-${offset}-${income}`}
              />
            </View>
            {column ? (
              <View style={{ alignItems: 'flex-start', marginLeft: -12, marginTop: 4 }}>
                <Button variant="text" icon="close" label={`Back to the whole ${UNIT[type]}`} onPress={() => setPicked(null)} />
              </View>
            ) : null}
          </Card>

          {sums.now === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: m3.secondaryContainer }]}>
                <Icon name="insights" size={40} color={m3.onSecondaryContainer} />
              </View>
              <AppText variant="titleLarge" style={{ textAlign: 'center' }}>
                Nothing {verb.toLowerCase()} {phrase}
              </AppText>
              <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={{ textAlign: 'center' }}>
                Add an entry and it will show up here.
              </AppText>
            </View>
          ) : null}

          {/* What stands out? */}
          {!column && notable.length > 0 ? (
            <>
              <Subheader text="What stands out" />
              <ListGroup>
                {notable.map((h) => (
                  <HighlightRow key={h.kind} h={h} onCategory={openCategory} />
                ))}
              </ListGroup>
            </>
          ) : null}

          {/* Where did it go? */}
          {lines.length > 0 ? (
            <>
              <Subheader text={`${income ? 'Where it came from' : 'Where it went'}${column ? `, ${column.name}` : ''}`} />
              <ListGroup>
                {shown.map((line) => (
                  <CategoryRow key={line.category.id} line={line} biggest={lines[0].amount} compare={!column && sums.before > 0} income={income} onPress={() => openCategory(line.category.id)} />
                ))}
              </ListGroup>
              {lines.length > FEW ? (
                <View style={{ alignItems: 'center', marginTop: 8 }}>
                  <Button variant="text" icon={showAll ? 'chevron-up' : 'chevron-down'} label={showAll ? 'Show fewer' : `Show all ${lines.length} categories`} onPress={() => setShowAll(!showAll)} />
                </View>
              ) : null}
            </>
          ) : null}

          {/* What's left of what came in? */}
          {settings.incomeTracking && !column && earned > 0 ? (
            <>
              <Subheader text="Earned and spent" />
              <Card style={styles.kept}>
                <AppText variant="titleMedium">{earned >= spent ? `You kept ${money(earned - spent)} of ${money(earned)}` : `You spent ${money(spent - earned)} more than you earned`}</AppText>
                <LinearProgress fraction={spent / earned} color={earned >= spent ? m3.primary : m3.error} height={12} />
                <View style={styles.keptFoot}>
                  <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
                    {money(spent)} spent{hasAssets ? ', with assets' : ''}
                  </AppText>
                  <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
                    {money(earned)} earned
                  </AppText>
                </View>
              </Card>
            </>
          ) : null}
        </ScrollView>
      </PeriodSwiper>
    </View>
  );
}

/** One thing worth noticing, in a sentence, leading to where it can be looked into. */
function HighlightRow({ h, onCategory }: { h: Highlight; onCategory: (id: string) => void }) {
  const money = useMoney();
  const row = (icon: IconName, headline: string, supporting: string, onPress: () => void) => <ListItem leading={<IconAvatar icon={icon} />} headline={headline} supporting={supporting} chevron onPress={onPress} />;
  switch (h.kind) {
    case 'assets':
      return row('assets', `${money(h.amount)} went into assets`, 'Gold, silver and funds: still yours', () => router.navigate('/portfolio'));
    case 'forecast': {
      const over = h.budget !== null ? h.amount - h.budget : 0;
      return row('calendar', `On pace for ${money(h.amount)}`, h.budget === null ? 'By the end of the month' : over > 0 ? `${money(over)} over your budget` : `${money(over)} inside your budget`, () => router.navigate('/budget'));
    }
    case 'up':
    case 'down':
      return (
        <ListItem
          leading={<EmojiAvatar emoji={h.category.emoji} colour={h.category.colour} />}
          headline={`${h.category.name} is ${h.kind} ${money(h.change)}`}
          supporting={`${money(h.amount)}, ${h.kind} from ${money(h.kind === 'up' ? h.amount - h.change : h.amount + h.change)}`}
          chevron
          onPress={() => onCategory(h.category.id)}
        />
      );
    case 'biggest':
      return row('arrow-up', `Biggest: ${h.entry.note}, ${money(h.entry.amount)}`, shortDate(new Date(h.entry.date)), () => router.push({ pathname: '/transaction', params: { id: h.entry.id } }));
    case 'often':
      return row('repeat', `${h.note}, ${h.times} times`, `${money(h.amount)} in all`, () => router.push({ pathname: '/search', params: { q: h.note } }));
  }
}

const styles = StyleSheet.create({
  navigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 },
  hero: { marginHorizontal: 16, marginTop: 4, padding: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  compare: { minHeight: 24, justifyContent: 'center', marginTop: 4 },
  empty: { alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingTop: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kept: { marginHorizontal: 16, padding: 16, gap: 12 },
  keptFoot: { flexDirection: 'row', justifyContent: 'space-between' },
});
