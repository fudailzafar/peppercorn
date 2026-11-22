import { Tabs } from 'expo-router';
import { Dimensions, Easing } from 'react-native';
import { DimeTabBar } from '../../components/TabBar';

/**
 * Switching tabs slides the whole screen sideways, in the direction of the tab you chose:
 * tapping a tab to the right pushes the current screen out to the left, and the reverse.
 * Progress is clamped to one screen width, so jumping Log -> Settings is still a single swipe.
 */
const slideBetweenTabs = ({ current }: { current: { progress: { interpolate: (c: object) => unknown } } }) => {
  const width = Dimensions.get('window').width;
  return {
    sceneStyle: {
      transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width, 0, width], extrapolate: 'clamp' }) }],
    },
  };
};

// Open on the Log tab.
export const unstable_settings = { anchor: 'index' };

export default function TabLayout() {
  return (
    <Tabs backBehavior="initialRoute" screenOptions={{
        headerShown: false,
        sceneStyleInterpolator: slideBetweenTabs as never,
        transitionSpec: { animation: 'timing', config: { duration: 300, easing: Easing.inOut(Easing.ease) } },
      }} tabBar={(props) => <DimeTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Log' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
