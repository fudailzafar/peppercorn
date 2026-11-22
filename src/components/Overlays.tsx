import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View, type HostInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUi } from '../lib/store';
import { elevation, shape, stateLayer, typeScale } from '../theme/material';
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

// MARK: Bottom confirmation card ("Delete 'Coffee'?")

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
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} onPress={onCancel} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: c.PrimaryBackground, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <AppText size={24} weight="medium" style={{ marginBottom: 2 }}>
            {title}
          </AppText>
          <AppText size={19} weight="medium" color="SubtitleText" style={{ marginBottom: 24 }}>
            {message}
          </AppText>
          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [styles.bigButton, { backgroundColor: destructive ? c.Alert : c.SecondaryBackground }, pressed && { opacity: 0.7 }]}
          >
            <AppText size={20} weight="semibold" color={destructive ? 'AlertRed' : 'PrimaryText'}>
              {confirmLabel}
            </AppText>
          </Pressable>
          <Pressable onPress={onCancel} style={({ pressed }) => [styles.bigButton, { backgroundColor: c.SecondaryBackground, marginTop: 8 }, pressed && { opacity: 0.7 }]}>
            <AppText size={20} weight="semibold">
              Cancel
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// MARK: HUD toast

export function ToastHost() {
  const toast = useUi((s) => s.toast);
  const dismiss = useUi((s) => s.dismissToast);
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (toast) Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
    else anim.setValue(0);
  }, [toast, anim]);

  if (!toast) return null;
  const tint = toast.tone === 'error' ? c.AlertRed : toast.tone === 'success' ? c.IncomeGreen : c.DarkIcon;

  return (
    <Animated.View
      style={[
        styles.toastWrap,
        { top: insets.top + 8, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] },
      ]}
    >
      <Pressable
        onPress={() => {
          toast.onTap?.();
          dismiss();
        }}
        style={[styles.toast, { backgroundColor: dark ? c.TertiaryBackground : '#FFFFFF' }]}
      >
        <Ionicons name={toast.icon as keyof typeof Ionicons.glyphMap} size={32} color={tint} />
        <View style={{ marginLeft: 12 }}>
          <AppText size={17} weight="semibold">
            {toast.title}
          </AppText>
          {toast.subtitle ? (
            <AppText size={14} weight="medium" color="SubtitleText">
              {toast.subtitle}
            </AppText>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  popover: { position: 'absolute', borderRadius: shape.extraSmall, paddingVertical: 8, overflow: 'hidden' },
  item: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, overflow: 'hidden' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 28 },
  bigButton: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 999 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
