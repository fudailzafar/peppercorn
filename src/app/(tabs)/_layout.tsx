import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Fab } from '../../components/Fab';
import { DimeTabBar } from '../../components/TabBar';

// Open on the Home tab.
export const unstable_settings = { anchor: 'index' };

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
    <Tabs backBehavior="initialRoute" screenOptions={{
        headerShown: false,
        // Tabs switch instantly, like most apps.
        animation: 'none',
      }} tabBar={(props) => <DimeTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Assets' }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget' }} />
      <Tabs.Screen name="settings" options={{ title: 'You' }} />
    </Tabs>
    <Fab />
    </View>
  );
}
