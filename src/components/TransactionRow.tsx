import { router } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, Extrapolation, interpolate, interpolateColor, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { dayLabel, timeLabel } from '../lib/dates';
import { currencySymbol, fmtFull } from '../lib/format';
import { Haptics } from '../lib/haptics';
import { useStore } from '../lib/store';
import type { Transaction } from '../lib/types';
import { springs } from '../theme/motion';
import { useTheme, withAlpha } from '../theme/theme';
import { AppText } from './AppText';
import { EmojiTile } from './Bits';
import { Popover, PopoverItem, useAnchor, anchorProps } from './Overlays';

// Dime's swipe-to-delete: past 20% of the screen a confirmation card opens on release; past 42% the row flies off and deletes.
const POPUP = 0.2;
const CONFIRM = 0.42;

interface Props {
  transaction: Transaction;
  /** An upcoming (not yet logged) occurrence: dimmed, shows its date. */
  future?: boolean;
  /** Date to show for a future row. */
  futureDate?: number;
  /** Opens the confirmation card (a medium swipe, or the long-press menu). */
  onDelete: (t: Transaction) => void;
  /** Deletes immediately with an Undo toast (a long swipe). Falls back to onDelete. */
  onQuickDelete?: (t: Transaction) => void;
}

/** One log entry: emoji tile, note, time and amount. Swipe left to delete, long-press for a menu. */
export function TransactionRow({ transaction: t, future = false, futureDate, onDelete, onQuickDelete }: Props) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const category = useStore((s) => s.categories.find((x) => x.id === t.categoryId));
  const showSign = useStore((s) => s.settings.showSign);
  const currency = useStore((s) => s.settings.currency);
  const stopRecurring = useStore((s) => s.stopRecurring);
  const menu = useAnchor();

  const canDelete = !future || t.recurringType > 0;

  // The gesture runs on the UI thread, so it reaches React through these stable callbacks, which read the latest props.
  const latest = useRef({ onDelete, onQuickDelete: onQuickDelete ?? onDelete, row: t });
  useEffect(() => {
    latest.current = { onDelete, onQuickDelete: onQuickDelete ?? onDelete, row: t };
  });
  const askDelete = useCallback(() => latest.current.onDelete(latest.current.row), []);
  const deleteSoon = useCallback(() => {
    // 0.4s after letting go, once the row has flown off.
    setTimeout(() => latest.current.onQuickDelete(latest.current.row), 400);
  }, []);
  const tickLight = useCallback(() => Haptics.light(), []);
  const tickMedium = useCallback(() => Haptics.medium(), []);

  const x = useSharedValue(0);
  const popupReached = useSharedValue(false);
  const confirmReached = useSharedValue(false);

  const pan = usePanGesture({
    enabled: canDelete,
    // Only a leftward drag starts it, and a mostly-vertical one is left to the list.
    activeOffsetX: [-12, 1000],
    failOffsetY: [-12, 12],
    onUpdate: (e) => {
      'worklet';
      const offset = Math.min(0, e.translationX);
      x.set(offset);
      const nowPopup = -offset > width * POPUP;
      const nowConfirm = -offset > width * CONFIRM;
      if (nowPopup && !popupReached.get()) scheduleOnRN(tickLight);
      if (nowConfirm && !confirmReached.get()) scheduleOnRN(tickMedium);
      popupReached.set(nowPopup);
      confirmReached.set(nowConfirm);
    },
    onDeactivate: () => {
      'worklet';
      if (confirmReached.get()) {
        // Fly off the left edge over 0.3s.
        x.set(withTiming(x.get() - width, { duration: 300, easing: Easing.inOut(Easing.ease) }));
        scheduleOnRN(deleteSoon);
      } else {
        x.set(withSpring(0, springs.smooth));
        if (popupReached.get()) scheduleOnRN(askDelete);
      }
    },
    onFinalize: () => {
      'worklet';
      popupReached.set(false);
      confirmReached.set(false);
      // A cancelled drag (the system took the touch) should never leave the row displaced.
      if (x.get() < 0 && !confirmReached.get()) x.set(withSpring(0, springs.smooth));
    },
  });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  // The X circle slides in from the right edge as the row is dragged, then turns red past the delete point.
  const armed = useDerivedValue(() => withTiming(-x.get() > width * CONFIRM ? 1 : 0, { duration: 150 }));
  const xWrapStyle = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(x.get(), [-80, 0], [0, 80], Extrapolation.CLAMP) }] }));
  // Computed here, not inside the worklet: withAlpha is a normal JS function and cannot run on the UI thread.
  const redTint = withAlpha(c.AlertRed, 0.23);
  const calmTint = c.SecondaryBackground;
  const xCircleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(armed.get(), [0, 1], [calmTint, redTint]),
    transform: [{ scale: interpolate(armed.get(), [0, 1], [1, 1.1]) }],
  }));
  const greyIconStyle = useAnimatedStyle(() => ({ opacity: 1 - armed.get() }));
  const redIconStyle = useAnimatedStyle(() => ({ opacity: armed.get() }));

  const sign = !showSign ? '' : t.income ? '+' : '-';
  const amountColor = future ? 'SubtitleText' : t.income ? 'IncomeGreen' : 'PrimaryText';
  const subtitle = future ? dayLabel(new Date(futureDate ?? t.date)) : timeLabel(t.date);

  return (
    <View>
      <Animated.View pointerEvents="none" style={[styles.xWrap, xWrapStyle]}>
        <Animated.View style={[styles.xCircle, xCircleStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.xIcon, greyIconStyle]}>
            <Ionicons name="close" size={14} color={c.SubtitleText} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.xIcon, redIconStyle]}>
            <Ionicons name="close" size={14} color={c.AlertRed} />
          </Animated.View>
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={pan}>
      <Animated.View style={[{ backgroundColor: c.PrimaryBackground }, rowStyle]}>
        <View {...anchorProps(menu)}>
          <Pressable
            onPress={() => router.push({ pathname: '/transaction', params: { id: t.id } })}
            onLongPress={() => {
              Haptics.light();
              menu.open();
            }}
            delayLongPress={350}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.SecondaryBackground }]}
            accessibilityLabel={`${t.note}, ${currencySymbol(currency)}${fmtFull(t.amount)}`}
          >
            <View>
              <EmojiTile emoji={category?.emoji ?? '❓'} colour={category?.colour ?? '#A6A6A6'} future={future} />
              {t.recurringType > 0 ? (
                <View style={[styles.recurBadge, { backgroundColor: c.SecondaryBackground }]}>
                  <Ionicons name="refresh" size={11} color={c.DarkIcon} />
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText size={17} weight="medium" color={future ? 'SubtitleText' : 'PrimaryText'} numberOfLines={1}>
                {t.note}
              </AppText>
              <AppText size={15} weight="medium" color={future ? 'EvenLighterText' : 'SubtitleText'} numberOfLines={1}>
                {subtitle}
              </AppText>
            </View>
            <AppText size={20} weight="medium" color={amountColor} numberOfLines={1} style={{ marginLeft: 8 }}>
              {sign}
              {currencySymbol(currency)}
              {fmtFull(t.amount)}
            </AppText>
          </Pressable>
        </View>
      </Animated.View>
      </GestureDetector>

      <Popover visible={menu.visible} anchor={menu.anchor} onClose={menu.close} align="center" width={200}>
        {t.recurringType > 0 ? (
          <PopoverItem
            label="Stop Recurring"
            icon="close"
            onPress={() => {
              menu.close();
              stopRecurring(t.id);
            }}
          />
        ) : null}
        <PopoverItem
          label="Edit"
          icon="pencil"
          onPress={() => {
            menu.close();
            router.push({ pathname: '/transaction', params: { id: t.id } });
          }}
        />
        {canDelete ? (
          <PopoverItem
            label="Delete"
            icon="trash"
            destructive
            onPress={() => {
              menu.close();
              onDelete(t);
            }}
          />
        ) : null}
      </Popover>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
  recurBadge: { position: 'absolute', right: -5, bottom: -5, borderRadius: 6, padding: 3 },
  xWrap: { ...StyleSheet.absoluteFill, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 10 },
  xCircle: { width: 28, height: 28, borderRadius: 14 },
  xIcon: { alignItems: 'center', justifyContent: 'center' },
});
