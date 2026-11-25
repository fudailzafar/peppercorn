import { useState, type ComponentRef, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elevation, shape } from '../theme/material';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { Touch } from './Touch';

export interface MenuItem {
  label: string;
  icon?: IconName;
  selected?: boolean;
  destructive?: boolean;
  onPress: () => void;
}

interface Place {
  x: number;
  y: number;
  width: number;
  height: number;
}

const WIDTH = 220;
const LINE = 48;

/** A button, or anything else, that opens a menu beside it. */
export function Menu({ items, children }: { items: readonly MenuItem[]; children: (open: () => void) => ReactNode }) {
  const [anchor, setAnchor] = useState<ComponentRef<typeof View> | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const open = () => anchor?.measureInWindow((x, y, width, height) => setPlace({ x, y, width, height }));
  return (
    <>
      <View ref={setAnchor} collapsable={false}>
        {children(open)}
      </View>
      {place ? <Open place={place} items={items} onClose={() => setPlace(null)} /> : null}
    </>
  );
}

/** The menu itself: under its button, or over it when there is no room below. */
function Open({ place, items, onClose }: { place: Place; items: readonly MenuItem[]; onClose: () => void }) {
  const { m3 } = useTheme();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tall = items.length * LINE + 16;
  const below = window.height - insets.bottom - 8 - (place.y + place.height + 4);
  const top = below >= tall ? place.y + place.height + 4 : Math.max(insets.top + 8, place.y - 4 - tall);
  // Lined up with the side of the screen its button is nearer to.
  const right = place.x + place.width / 2 > window.width / 2;
  const left = right ? place.x + place.width - WIDTH : place.x;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" accessibilityRole="button" />
      <View
        accessibilityRole="menu"
        accessibilityViewIsModal
        style={[styles.menu, elevation(2), { top, left: Math.min(Math.max(8, left), window.width - WIDTH - 8), maxHeight: window.height - top - insets.bottom - 8, backgroundColor: m3.surfaceContainer }]}
      >
        <ScrollView bounces={false}>
          {items.map((item) => {
            const ink = item.destructive ? m3.error : m3.onSurface;
            return (
              <Touch
                key={item.label}
                ink={ink}
                label={item.label}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: item.selected ?? false }}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                style={styles.line}
              >
                {item.icon ? <Icon name={item.icon} size={24} color={item.destructive ? ink : m3.onSurfaceVariant} /> : null}
                <AppText variant="bodyLarge" color={ink} numberOfLines={1} style={styles.label}>
                  {item.label}
                </AppText>
                {item.selected ? <Icon name="checkmark" size={20} color={m3.onSurfaceVariant} /> : null}
              </Touch>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menu: { position: 'absolute', width: WIDTH, paddingVertical: 8, borderRadius: shape.extraSmall, overflow: 'hidden' },
  line: { minHeight: LINE, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, overflow: 'hidden' },
  label: { flex: 1 },
});
