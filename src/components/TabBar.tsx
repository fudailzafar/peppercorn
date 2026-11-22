import { Tabs, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import type { ComponentProps } from 'react';
import { Haptics } from '../lib/haptics';
import { useStore, useUi } from '../lib/store';
import { tabIcons } from '../theme/tabIcons';
import { useTheme } from '../theme/theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type TabKey = keyof typeof tabIcons;
const ROUTE_ICON: Record<string, TabKey> = { index: 'log', insights: 'insights', budget: 'budget', settings: 'settings' };

function TabIcon({ icon, color }: { icon: TabKey; color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24">
      {tabIcons[icon].map((p, i) => (
        <Path key={i} d={p.d} fill={color} fillRule={p.fillRule} clipRule={p.clipRule} />
      ))}
    </Svg>
  );
}

/** Dime's tab bar: four icons around a dark "+" button that opens the entry screen. */
export function DimeTabBar({ state, navigateToTab, emitter, insets }: BottomTabBarProps) {
  const { c } = useTheme();
  const hidden = useUi((s) => s.hideTabBar);
  const empty = useStore((s) => s.transactions.length === 0);

  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    return (
      <Pressable
        key={route.key}
        style={({ pressed }) => [styles.tab, pressed && { transform: [{ scale: 0.6 }] }]}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={`${route.name === 'index' ? 'Log' : route.name} tab`}
        onPress={() => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!event.defaultPrevented) navigateToTab(route.key);
        }}
      >
        <TabIcon icon={ROUTE_ICON[route.name] ?? 'log'} color={focused ? c.DarkIcon : c.GreyIcon} />
      </Pressable>
    );
  });

  if (hidden) return null;
  return (
    <View style={[styles.bar, { backgroundColor: c.PrimaryBackground, paddingBottom: Math.max(insets.bottom, 12) }]}>
      {tabs.slice(0, 2)}
      <AddButton pulse={empty} />
      {tabs.slice(2)}
    </View>
  );
}

function AddButton({ pulse }: { pulse: boolean }) {
  const { c } = useTheme();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!pulse) {
      anim.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(anim, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [pulse, anim]);

  const ring = (w: number, h: number, r: number, from: number, opacity: number) => (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: w,
        height: h,
        borderRadius: r,
        backgroundColor: c.DarkBackground,
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [opacity, 0] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }],
      }}
    />
  );

  return (
    <View style={styles.addWrap}>
      {pulse ? ring(95, 68, 28, 0.4, 0.6) : null}
      {pulse ? ring(80, 53, 20.5, 0.6, 0.8) : null}
      <Pressable
        onPress={() => {
          Haptics.light();
          router.push('/transaction');
        }}
        accessibilityLabel="Add New Transaction"
        style={({ pressed }) => [styles.addButton, { backgroundColor: pressed ? c.SubtitleText : c.DarkBackground }]}
      >
        <Ionicons name="add" size={28} color={c.LightIcon} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 12 },
  tab: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  addWrap: { width: 95, height: 68, alignItems: 'center', justifyContent: 'center' },
  addButton: { width: 65, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
