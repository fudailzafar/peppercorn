import { Tabs } from 'expo-router';
import { Easing, View } from 'react-native';
import { Fab } from '../../components/Fab';
import { m3Duration, m3Easing } from '../../theme/material';
import { DimeTabBar } from '../../components/TabBar';

/**
 * Material 3 "fade through": the leaving screen fades out, then the new one fades in while growing slightly.
 * (The iOS-style version slides sideways instead.)
 */
const fadeThrough = ({ current }: { current: { progress: { interpolate: (c: object) => unknown } } }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({ inputRange: [-1, -0.6, 0, 0.6, 1], outputRange: [0, 0, 1, 0, 0], extrapolate: 'clamp' }),
    transform: [{ scale: current.progress.interpolate({ inputRange: [-1, -0.6, 0, 0.6, 1], outputRange: [0.92, 0.92, 1, 0.92, 0.92], extrapolate: 'clamp' }) }],
  },
});

// Open on the Log tab.
export const unstable_settings = { anchor: 'index' };

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
    <Tabs backBehavior="initialRoute" screenOptions={{
        headerShown: false,
        sceneStyleInterpolator: fadeThrough as never,
        transitionSpec: { animation: 'timing', config: { duration: m3Duration.medium2, easing: Easing.bezier(...m3Easing.emphasized) } },
      }} tabBar={(props) => <DimeTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Log' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
    <Fab />
    </View>
  );
}
