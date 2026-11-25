import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { assetOf, quantityLabel } from '@/domain/assets';
import { shortLabel, timeLabel, toDay, weekdayLabel } from '@/domain/dates';
import { categoryOf } from '@/domain/entries';
import type { Day, Entry } from '@/domain/model';
import { haptics } from '@/lib/haptics';
import { openPage } from '@/lib/navigation';
import { store } from '@/state/app';
import { useAppState, useMoney, useSettings } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Icon } from '@/ui/Icon';
import { EmojiAvatar } from '@/ui/material';
import { Menu, type MenuItem } from '@/ui/Menu';
import { Touch } from '@/ui/Touch';
import { SwipeAway } from './SwipeAway';
import type { Deleter } from './useDeleter';

interface Props {
  entry: Entry;
  deleter: Deleter;
  /** Today's day, to leave this year's out. */
  today: Day;
  /** When it is next due, for one that hasn't happened yet. */
  due?: Day;
  /** The list already says the day. */
  timeOnly?: boolean;
}

const edit = (entry: Entry) => openPage({ pathname: '/entry', params: { id: entry.id } });

/** One entry. Tap to edit, swipe left to delete (with Undo), hold for a menu. */
export const EntryRow = memo(function EntryRow({ entry, deleter, today, due, timeOnly = false }: Props) {
  const { m3 } = useTheme();
  const money = useMoney();
  const { signs } = useSettings();
  const category = useAppState((s) => categoryOf(s.data, entry.categoryId));
  const future = due !== undefined;

  const when = due ? weekdayLabel(due, today) : timeOnly ? timeLabel(entry.date) : `${shortLabel(toDay(entry.date), today)}, ${timeLabel(entry.date)}`;
  const details = entry.asset && entry.quantity !== undefined ? `${quantityLabel(assetOf(entry.asset), entry.quantity)} · ${when}` : when;
  const sign = signs ? (entry.income ? '+' : '-') : '';
  const amount = sign + money.full(entry.amount);

  const items: MenuItem[] = [{ label: 'Edit', icon: 'pencil', onPress: () => edit(entry) }];
  if (entry.repeat) items.unshift({ label: 'Stop repeating', icon: 'close', onPress: () => store.stopRepeating(entry.id) });
  // One that hasn't happened can't be deleted: that would be the past entry it repeats from.
  if (!future) items.push({ label: 'Delete', icon: 'trash', destructive: true, onPress: () => deleter.ask(entry) });

  const row = (
    <Menu items={items}>
      {(openMenu) => (
        <Touch
          ink={m3.onSurface}
          label={`${entry.note}, ${amount}, ${details}${entry.repeat ? ', repeats' : ''}`}
          accessibilityActions={[{ name: 'longpress', label: 'More' }, ...(future ? [] : [{ name: 'delete', label: 'Delete' }])]}
          onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'delete' ? deleter.ask(entry) : openMenu())}
          onPress={() => edit(entry)}
          onLongPress={() => {
            haptics.tap();
            openMenu();
          }}
          style={[styles.row, { backgroundColor: m3.surface }]}
        >
          <EmojiAvatar emoji={category?.emoji ?? '❔'} colour={category?.colour ?? m3.outline} dimmed={future} />
          <View style={styles.middle}>
            <AppText variant="bodyLarge" numberOfLines={1} color={future ? m3.onSurfaceVariant : m3.onSurface}>
              {entry.note}
            </AppText>
            <View style={styles.details}>
              {entry.repeat ? <Icon name="repeat" size={14} color={m3.onSurfaceVariant} /> : null}
              <AppText variant="bodyMedium" numberOfLines={1} color={m3.onSurfaceVariant} style={styles.shrink}>
                {details}
              </AppText>
            </View>
          </View>
          <AppText variant="titleMedium" numberOfLines={1} color={future ? m3.onSurfaceVariant : entry.income ? m3.success : m3.onSurface}>
            {amount}
          </AppText>
        </Touch>
      )}
    </Menu>
  );
  // Swiping away one that hasn't happened would be a surprise.
  return future ? row : <SwipeAway onGone={() => deleter.now(entry)}>{row}</SwipeAway>;
});

const styles = StyleSheet.create({
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  middle: { flex: 1, marginLeft: 16, marginRight: 12 },
  details: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shrink: { flexShrink: 1 },
});
