import { Pressable, StyleSheet, View } from 'react-native';
import type { CategoryLine } from '@/domain/insights';
import { useMoney } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { EmojiAvatar } from '@/ui/material/List';
import { LinearProgress } from '@/ui/material/Progress';
import { StateLayer } from '@/ui/material/StateLayer';

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
          <View style={styles.about}>
            <View>
              <View style={styles.names}>
                <AppText variant="titleMedium" numberOfLines={1} style={styles.fill}>
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
  about: { flex: 1, gap: 8 },
  names: { flexDirection: 'row', gap: 8 },
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
});
