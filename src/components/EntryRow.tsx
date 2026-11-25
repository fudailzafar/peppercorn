import { memo, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useAppState, useMoney, useSettings } from '../data/hooks';
import { store } from '../data/app';
import { assetOf, quantityLabel } from '../domain/assets';
import { shortLabel, timeLabel, toDay, weekdayLabel } from '../domain/dates';
import { categoryOf } from '../domain/entries';
import type { Day, Entry } from '../domain/model';
import { haptics } from '../hooks/haptics';
import { openPage } from '../hooks/nav';
import type { Deleter } from '../hooks/useDeleter';
import { m3Duration } from '../theme/material';
import { leaving, settle } from '../theme/motion';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { EmojiAvatar } from './material';
import { Menu, type MenuItem } from './Menu';
import { Touch } from './Touch';

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

/** Dragged left past this much of its width, a row goes. A flick alone never deletes anything. */
const AWAY = 0.42;

function SwipeAway({ onGone, children }: { onGone: () => void; children: ReactNode }) {
  const { m3 } = useTheme();
  const { width } = useWindowDimensions();
  const across = Math.min(width, 480);
  const x = useSharedValue(0);
  const armed = useSharedValue(false);
  const pan = usePanGesture({
    activeOffsetX: -16,
    failOffsetX: 16,
    failOffsetY: [-12, 12],
    onUpdate: (e) => {
      'worklet';
      x.set(Math.min(0, e.translationX));
      const now = -e.translationX > across * AWAY;
      if (now !== armed.get()) {
        armed.set(now);
        if (now) scheduleOnRN(haptics.tap);
      }
    },
    onDeactivate: () => {
      'worklet';
      if (armed.get())
        x.set(
          withTiming(-across, { duration: m3Duration.short4, easing: leaving }, (finished) => {
            'worklet';
            if (finished) scheduleOnRN(onGone);
          }),
        );
      else x.set(withSpring(0, settle));
    },
  });
  const { error, errorContainer, onErrorContainer } = m3;
  const moved = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const behind = useAnimatedStyle(() => ({ opacity: x.get() < 0 ? 1 : 0, backgroundColor: interpolateColor(armed.get() ? 1 : 0, [0, 1], [errorContainer, error]) }));
  return (
    <View style={styles.clip}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.behind, behind]} aria-hidden>
        <Icon name="trash-outline" size={24} color={onErrorContainer} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={moved}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  middle: { flex: 1, marginLeft: 16, marginRight: 12 },
  details: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shrink: { flexShrink: 1 },
  clip: { overflow: 'hidden' },
  behind: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 24 },
});
