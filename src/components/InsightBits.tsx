import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { useMoney } from '../data/hooks';
import type { CategoryLine, Compared } from '../domain/insights';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { EmojiAvatar } from './material/List';
import { LinearProgress } from './material/Progress';
import { StateLayer } from './m3';

/**
 * How this compares, in words with an icon. Spending less (or earning more) is green; the other way stays neutral:
 * it is information, not a telling-off.
 */
export function Comparison({ now, before, income, against }: Compared & { income: boolean; against: string }) {
  const { m3 } = useTheme();
  const { brief: money } = useMoney();
  if (before <= 0) {
    return (
      <AppText variant="bodyMedium" color={m3.onSurfaceVariant}>
        Nothing {income ? 'earned' : 'spent'} {against.startsWith('this time') ? `by ${against}` : against}
      </AppText>
    );
  }
  const change = now - before;
  const same = Math.abs(change) < before * 0.01;
  const good = income ? change > 0 : change < 0;
  const ink = !same && good ? m3.success : m3.onSurfaceVariant;
  return (
    <View style={styles.compare}>
      {same ? null : <Icon name={change > 0 ? 'trending-up' : 'trending-down'} size={18} color={ink} />}
      <AppText variant="bodyMedium" color={ink} style={{ flexShrink: 1 }}>
        {same ? `About the same as ${against}` : `${money(change)} ${change > 0 ? 'more' : 'less'} than ${against}`}
      </AppText>
    </View>
  );
}

/** A category with its bar, drawn against the biggest one so lengths can be compared down the list. */
export function CategoryRow({ line, biggest, compare, income, onPress }: { line: CategoryLine; biggest: number; compare: boolean; income: boolean; onPress: () => void }) {
  const { m3 } = useTheme();
  const { brief: money } = useMoney();
  const change = line.amount - line.before;
  const note = !compare ? '' : line.before <= 0 ? ' · new' : Math.abs(change) < line.before * 0.01 ? ' · about the same' : ` · ${money(change)} ${change > 0 ? 'more' : 'less'}`;
  const percent = Math.round(line.share * 100);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${line.category.name}, ${money(line.amount)}, ${percent}% of what you ${income ? 'earned' : 'spent'}${note.replace(' ·', ',')}`}
      android_ripple={{ color: `${m3.onSurface}1F` }}
      style={styles.row}
    >
      {({ pressed }) => (
        <>
          <StateLayer pressed={pressed} color={m3.onSurface} />
          <EmojiAvatar emoji={line.category.emoji} colour={line.category.colour} />
          <View style={{ flex: 1, gap: 8 }}>
            <View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <AppText variant="titleMedium" numberOfLines={1} style={{ flex: 1 }}>
                  {line.category.name}
                </AppText>
                <AppText variant="titleMedium">{money(line.amount)}</AppText>
              </View>
              <AppText variant="bodyMedium" color={m3.onSurfaceVariant} numberOfLines={1}>
                {percent < 1 ? 'Under 1%' : `${percent}%`}
                {note}
              </AppText>
            </View>
            <LinearProgress fraction={biggest > 0 ? line.amount / biggest : 0} color={m3.primary} track="transparent" stop={false} />
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compare: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
});
