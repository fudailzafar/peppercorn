import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Haptics } from '../lib/haptics';
import { useStore, useUi } from '../lib/store';
import { elevation, shape, stateLayer } from '../theme/material';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { NAV_BAR_HEIGHT } from './TabBar';

/**
 * The add-entry floating action button: a 56dp FAB (16dp corners, elevation 3) above the navigation bar.
 * With an empty log it extends to show a label, as M3 does when an action needs attention.
 */
export function Fab() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const hidden = useUi((s) => s.hideTabBar);
  const empty = useStore((s) => s.transactions.length === 0);
  if (hidden) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: NAV_BAR_HEIGHT + insets.bottom + 16 }]}>
      <Pressable
        onPress={() => {
          Haptics.light();
          router.push('/transaction');
        }}
        accessibilityRole="button"
        accessibilityLabel="Add entry"
        android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
        style={({ pressed }) => [styles.fab, { backgroundColor: m3.primary }, elevation(3), empty && styles.extended]}
      >
        {({ pressed }) => (
          <>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: m3.onPrimary, opacity: pressed ? stateLayer.pressed : 0, borderRadius: shape.large }]} />
            <Icon name="add" size={24} color={m3.onPrimary} />
            {empty ? (
              <AppText size={14} weight="semibold" color={m3.onPrimary} style={{ letterSpacing: 0.1 }}>
                Add entry
              </AppText>
            ) : null}
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16, left: 16, alignItems: 'flex-end' },
  fab: { minWidth: 56, height: 56, borderRadius: shape.large, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, overflow: 'hidden' },
  extended: { paddingHorizontal: 20 },
});
