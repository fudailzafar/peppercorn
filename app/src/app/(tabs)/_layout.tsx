import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Fab } from '@/features/shell/Fab';
import { TabBar, TABS } from '@/features/shell/TabBar';

export const unstable_settings = { anchor: 'index' };

/** The five tabs, with the add button over them. Back leads to Home first. */
export default function TabsLayout() {
  return (
    <View style={styles.fill}>
      <Tabs backBehavior="initialRoute" screenOptions={{ headerShown: false, animation: 'none' }} tabBar={(props) => <TabBar {...props} />}>
        {Object.entries(TABS).map(([name, { label }]) => (
          <Tabs.Screen key={name} name={name} options={{ title: label }} />
        ))}
      </Tabs>
      <Fab />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
