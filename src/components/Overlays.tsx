import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View, type HostInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUi } from '../lib/store';
import { elevation, shape, stateLayer, typeScale } from '../theme/material';
import { NAV_BAR_HEIGHT } from './TabBar';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

// MARK: Anchored popover (the small menus Dime shows under a button)

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Measures a view so a popover can appear next to it. */
export function useAnchor() {
  const [node, setNode] = useState<HostInstance | null>(null);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => {
    node?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setVisible(true);
    });
  }, [node]);
  const close = useCallback(() => setVisible(false), []);
  return { target: setNode, anchor, visible, open, close };
}

export type AnchorState = ReturnType<typeof useAnchor>;

/** Props that attach an anchor to a view: spread onto the element the popover should appear next to. */
export function anchorProps(a: AnchorState) {
  return { ref: a.target, collapsable: false as const };
}

export function Popover({
  visible,
  anchor,
  onClose,
  align = 'right',
  width = 180,
  children,
}: {
  visible: boolean;
  anchor: Rect | null;
  onClose: () => void;
  align?: 'left' | 'right' | 'center';
  width?: number;
  children: ReactNode;
}) {
  const { m3 } = useTheme();
  const win = useWindowDimensions();
  if (!anchor) return null;

  let left = align === 'right' ? anchor.x + anchor.width - width : align === 'left' ? anchor.x : anchor.x + anchor.width / 2 - width / 2;
  left = Math.max(12, Math.min(left, win.width - width - 12));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss menu" />
      {/* An M3 menu: a 4dp-cornered surface at elevation 2, positioned under its anchor. */}
      <View style={[styles.popover, elevation(2), { top: anchor.y + anchor.height + 4, left, width, backgroundColor: m3.surfaceContainer }]}>
        {children}
      </View>
    </Modal>
  );
}

export function PopoverItem({
  label,
  selected,
  icon,
  destructive,
  onPress,
}: {
  label: string;
  selected?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}) {
  const { m3 } = useTheme();
  const ink = destructive ? m3.error : m3.onSurface;
  return (
    <Pressable onPress={onPress} android_ripple={{ color: `${ink}1F` }} style={styles.item}>
      {({ pressed }) => (
        <>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: ink, opacity: pressed ? stateLayer.pressed : selected ? 0.06 : 0 }]} />
          {icon ? <Ionicons name={icon} size={24} color={destructive ? m3.error : m3.onSurfaceVariant} style={{ marginRight: 12 }} /> : null}
          <AppText size={typeScale.bodyLarge.size} color={ink} style={{ flex: 1, letterSpacing: typeScale.bodyLarge.tracking }}>
            {label}
          </AppText>
          {selected ? <Ionicons name="checkmark" size={20} color={m3.onSurfaceVariant} /> : null}
        </>
      )}
    </Pressable>
  );
}

// MARK: Confirmation dialog ("Delete 'Coffee'?")

/** An M3 basic dialog: 28dp corners, headline, supporting text, and right-aligned text buttons. */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  destructive = true,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { m3 } = useTheme();
  const action = (label: string, onPress: () => void, color: string) => (
    <Pressable onPress={onPress} accessibilityRole="button" android_ripple={{ color: `${color}22` }} style={styles.textButton}>
      {({ pressed }) => (
        <>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: pressed ? stateLayer.pressed : 0, borderRadius: shape.full }]} />
          <AppText size={typeScale.labelLarge.size} weight="semibold" color={color} style={{ letterSpacing: typeScale.labelLarge.tracking }}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.32)' }]} onPress={onCancel} accessibilityLabel="Dismiss dialog" />
      <View style={styles.dialogWrap} pointerEvents="box-none">
        <View style={[styles.dialog, elevation(3), { backgroundColor: m3.surfaceContainerHigh }]}>
          <AppText size={typeScale.headlineSmall.size} color={m3.onSurface}>
            {title}
          </AppText>
          <AppText size={typeScale.bodyMedium.size} color={m3.onSurfaceVariant} style={{ marginTop: 16, letterSpacing: typeScale.bodyMedium.tracking }}>
            {message}
          </AppText>
          <View style={styles.dialogActions}>
            {action('Cancel', onCancel, m3.primary)}
            {action(confirmLabel, onConfirm, destructive ? m3.error : m3.primary)}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// MARK: Snackbar

/**
 * An M3 snackbar: an inverse-surface bar above the navigation bar with one line of text and an optional
 * text action. Toasts that can be undone get an "Undo" action.
 */
export function ToastHost() {
  const toast = useUi((s) => s.toast);
  const dismiss = useUi((s) => s.dismissToast);
  const { m3, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (toast) Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    else anim.setValue(0);
  }, [toast, anim]);

  if (!toast) return null;
  const isError = toast.tone === 'error';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.toastWrap,
        { bottom: NAV_BAR_HEIGHT + insets.bottom + 88, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}
    >
      <Pressable onPress={dismiss} style={[styles.snackbar, elevation(3), { backgroundColor: m3.inverseSurface }]} accessibilityRole="alert">
        {isError ? <View style={[styles.toneDot, { backgroundColor: m3.error }]} /> : null}
        <View style={{ flex: 1 }}>
          <AppText size={typeScale.bodyMedium.size} color={m3.inverseOnSurface} style={{ letterSpacing: typeScale.bodyMedium.tracking }}>
            {toast.title}
          </AppText>
          {toast.subtitle && !toast.onTap ? (
            <AppText size={typeScale.bodySmall.size} color={m3.inverseOnSurface} style={{ opacity: 0.7 }}>
              {toast.subtitle}
            </AppText>
          ) : null}
        </View>
        {toast.onTap ? (
          <Pressable
            onPress={() => {
              toast.onTap?.();
              dismiss();
            }}
            hitSlop={8}
            style={styles.snackAction}
            accessibilityRole="button"
          >
            <AppText size={typeScale.labelLarge.size} weight="semibold" color={dark ? m3.primary : '#D0D0D0'}>
              Undo
            </AppText>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  popover: { position: 'absolute', borderRadius: shape.extraSmall, paddingVertical: 8, overflow: 'hidden' },
  item: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, overflow: 'hidden' },
  dialogWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 360, borderRadius: shape.extraLarge, padding: 24 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
  textButton: { minHeight: 40, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: shape.full, overflow: 'hidden' },
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 999 },
  snackbar: { width: '100%', maxWidth: 560, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 16, paddingRight: 8, borderRadius: shape.extraSmall },
  snackAction: { minHeight: 40, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  toneDot: { width: 8, height: 8, borderRadius: 4 },
});
