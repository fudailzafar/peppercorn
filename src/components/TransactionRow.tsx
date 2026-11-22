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
import { shape, typeScale } from '../theme/material';
import { springs } from '../theme/motion';
import { useTheme, withAlpha } from '../theme/theme';
import { AppText } from './AppText';
import { StateLayer } from './m3';
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
  const { m3 } = useTheme();
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
  // Material swipe-to-dismiss: a container reveals behind the row, turns solid red past the delete point,
  // and its trash icon grows. Colours are read here, not inside the worklets (they are plain JS values).
  const armed = useDerivedValue(() => withTiming(-x.get() > width * CONFIRM ? 1 : 0, { duration: 150 }));
  const calm = m3.errorContainer;
  const hot = m3.error;
  const revealStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(armed.get(), [0, 1], [calm, hot]) }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(armed.get(), [0, 1], [1, 1.25]) }, { translateX: interpolate(x.get(), [-96, 0], [0, 24], Extrapolation.CLAMP) }],
  }));
  const calmIcon = useAnimatedStyle(() => ({ opacity: 1 - armed.get() }));
  const hotIcon = useAnimatedStyle(() => ({ opacity: armed.get() }));

  const sign = !showSign ? '' : t.income ? '+' : '-';
  const amountColor = future ? m3.onSurfaceVariant : t.income ? m3.success : m3.onSurface;
  const subtitle = future ? dayLabel(new Date(futureDate ?? t.date)) : timeLabel(t.date);
  const tint = category?.colour ?? '#A6A6A6';

  return (
    <View>
      <Animated.View pointerEvents="none" style={[styles.reveal, revealStyle]}>
        <Animated.View style={[styles.revealIcon, iconStyle]}>
          <Animated.View style={calmIcon}>
            <Ionicons name="trash-outline" size={24} color={m3.onErrorContainer} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, hotIcon]}>
            <Ionicons name="trash-outline" size={24} color={m3.onError} />
          </Animated.View>
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: m3.surface }, rowStyle]}>
          <View {...anchorProps(menu)}>
            {/* An M3 two-line list item: 40dp avatar, headline, supporting text, trailing amount. */}
            <Pressable
              onPress={() => router.push({ pathname: '/transaction', params: { id: t.id } })}
              onLongPress={() => {
                Haptics.light();
                menu.open();
              }}
              delayLongPress={350}
              android_ripple={{ color: `${m3.onSurface}1F` }}
              style={styles.row}
              accessibilityLabel={`${t.note}, ${currencySymbol(currency)}${fmtFull(t.amount)}`}
            >
              {({ pressed }) => (
                <>
                  <StateLayer pressed={pressed} color={m3.onSurface} />
                  <View style={[styles.avatar, { backgroundColor: withAlpha(tint, future ? 0.16 : 0.3) }]}>
                    <AppText size={20} style={{ includeFontPadding: false }}>
                      {category?.emoji ?? '❓'}
                    </AppText>
                  </View>
                  <View style={styles.texts}>
                    <AppText size={typeScale.bodyLarge.size} color={future ? m3.onSurfaceVariant : m3.onSurface} numberOfLines={1} style={{ letterSpacing: typeScale.bodyLarge.tracking }}>
                      {t.note}
                    </AppText>
                    <View style={styles.supporting}>
                      {t.recurringType > 0 ? <Ionicons name="repeat" size={14} color={m3.onSurfaceVariant} /> : null}
                      <AppText size={typeScale.bodyMedium.size} color={m3.onSurfaceVariant} numberOfLines={1} style={{ letterSpacing: typeScale.bodyMedium.tracking }}>
                        {subtitle}
                      </AppText>
                    </View>
                  </View>
                  <AppText size={typeScale.titleMedium.size} weight="semibold" color={amountColor} numberOfLines={1} style={{ marginLeft: 12, letterSpacing: typeScale.titleMedium.tracking }}>
                    {sign}
                    {currencySymbol(currency)}
                    {fmtFull(t.amount)}
                  </AppText>
                </>
              )}
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
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, overflow: 'hidden' },
  avatar: { width: 40, height: 40, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, marginLeft: 16 },
  supporting: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reveal: { ...StyleSheet.absoluteFill, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 24 },
  revealIcon: { width: 24, height: 24 },
});
