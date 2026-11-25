import type { Tabs } from 'expo-router';
import { useEffect, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { m3Duration, shape, stateLayer } from '../theme/material';
import { standardEasing } from '../theme/motion';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export const NAV_BAR_HEIGHT = 80;

/** Each tab's route, icon and name. */
export const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'home', label: 'Home' },
  insights: { icon: 'insights', label: 'Insights' },
  portfolio: { icon: 'assets', label: 'Assets' },
  budget: { icon: 'budget', label: 'Budget' },
  settings: { icon: 'person', label: 'You' },
};

/** Material's navigation bar. */
export function TabBar({ state, navigateToTab, emitter, insets }: Props) {
  const { m3 } = useTheme();
  return (
    <View style={[styles.bar, { height: NAV_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom, backgroundColor: m3.surfaceContainer }]} accessibilityRole="tablist">
      {state.routes.map(({ key, name }, i) => {
        const press = () => {
          if (!emitter.emit({ type: 'tabPress', target: key, canPreventDefault: true }).defaultPrevented) navigateToTab(key);
        };
        return TABS[name] ? <TabButton key={key} {...TABS[name]} selected={state.index === i} onPress={press} /> : null;
      })}
    </View>
  );
}

function TabButton({ icon, label, selected, onPress }: { icon: IconName; label: string; selected: boolean; onPress: () => void }) {
  const { m3 } = useTheme();
  const on = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, { duration: m3Duration.medium2, easing: standardEasing }));
  }, [on, selected]);
  // The pill behind the icon grows out from the middle.
  const pill = useAnimatedStyle(() => ({ opacity: on.get(), transform: [{ scaleX: 0.4 + 0.6 * on.get() }] }));
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} style={styles.tab}>
      {({ pressed }) => (
        <>
          <View style={styles.icon}>
            <Animated.View style={[styles.pill, { backgroundColor: m3.secondaryContainer }, pill]} />
            <View style={[styles.pill, { backgroundColor: m3.onSurface, opacity: pressed ? stateLayer.pressed : 0 }]} />
            <View style={styles.front}>
              <Icon name={icon} size={24} color={selected ? m3.onSecondaryContainer : m3.onSurfaceVariant} />
            </View>
          </View>
          <AppText variant="labelMedium" weight={selected ? 'medium' : 'regular'} color={selected ? m3.onSurface : m3.onSurfaceVariant} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingTop: 12 },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  icon: { width: 64, height: 32, alignItems: 'center', justifyContent: 'center' },
  pill: { ...StyleSheet.absoluteFill, borderRadius: shape.full },
  // On the web, views placed absolutely would cover it.
  front: { zIndex: 1 },
});
