import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ComponentProps } from 'react';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useUi } from '../lib/store';
import { m3Duration, m3Easing, shape } from '../theme/material';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type TabKey = 'home' | 'insights' | 'assets' | 'budget' | 'person';
const ROUTE_ICON: Record<string, TabKey> = { index: 'home', insights: 'insights', portfolio: 'assets', budget: 'budget', settings: 'person' };
const ROUTE_LABEL: Record<string, string> = { index: 'Home', insights: 'Insights', portfolio: 'Assets', budget: 'Budget', settings: 'You' };

/** Height of the bar's content, from the M3 navigation bar spec (80dp), excluding the system inset. */
export const NAV_BAR_HEIGHT = 80;

/** One destination: icon in a pill-shaped active indicator, with the label below (M3 navigation bar item). */
function Destination({ focused, icon, label, onPress }: { focused: boolean; icon: TabKey; label: string; onPress: () => void }) {
  const { m3 } = useTheme();
  const progress = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    // The indicator grows outward from its centre with M3's emphasized easing.
    progress.set(withTiming(focused ? 1 : 0, { duration: m3Duration.medium2, easing: Easing.bezier(...m3Easing.emphasized) }));
  }, [focused, progress]);
  const indicator = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scaleX: interpolate(progress.get(), [0, 1], [0.4, 1]) }],
  }));

  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} style={styles.item}>
      {({ pressed }) => (
        <>
          <View style={styles.indicatorBox}>
            <Animated.View style={[styles.indicator, { backgroundColor: m3.secondaryContainer }, indicator]} />
            {/* The pressed state layer: a 10% overlay in the content colour. */}
            <View style={[styles.indicator, { backgroundColor: m3.onSurface, opacity: pressed ? 0.1 : 0 }]} />
            <View style={styles.iconLayer}>
              <Icon name={icon} size={24} color={focused ? m3.onSecondaryContainer : m3.onSurfaceVariant} />
            </View>
          </View>
          <AppText
            variant="labelMedium"
            weight={focused ? 'semibold' : 'medium'}
            color={focused ? m3.onSurface : m3.onSurfaceVariant}
           
          >
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

/** The five destinations in a Material 3 navigation bar. The add action is a floating action button (see Fab). */
export function AppTabBar({ state, navigateToTab, emitter, insets }: BottomTabBarProps) {
  const { m3 } = useTheme();
  const hidden = useUi((s) => s.hideTabBar);
  if (hidden) return null;

  return (
    <View style={[styles.bar, { backgroundColor: m3.surfaceContainer, paddingBottom: insets.bottom, height: NAV_BAR_HEIGHT + insets.bottom }]}>
      {state.routes.map((route, index) => (
        <Destination
          key={route.key}
          focused={state.index === index}
          icon={ROUTE_ICON[route.name] ?? 'home'}
          label={ROUTE_LABEL[route.name] ?? route.name}
          onPress={() => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!event.defaultPrevented) navigateToTab(route.key);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 12 },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  indicatorBox: { width: 64, height: 32, alignItems: 'center', justifyContent: 'center' },
  indicator: { ...StyleSheet.absoluteFill, borderRadius: shape.full },
  // Above the indicator even where absolutely positioned views would otherwise paint on top (web).
  iconLayer: { zIndex: 1 },
});
