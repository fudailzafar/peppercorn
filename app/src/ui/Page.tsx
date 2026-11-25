import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '@/lib/navigation';
import { useTheme } from '@/theme/theme';
import { TopAppBar } from '@/ui/material';

/** A page under a tab: its title, the way back, and its content. `scroll` is false when the content scrolls by itself. */
export function Page({ title, actions, scroll = true, children }: { title: string; actions?: ReactNode; scroll?: boolean; children: ReactNode }) {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.fill, { backgroundColor: m3.surface }]}>
      <TopAppBar title={title} onBack={goBack} actions={actions} />
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
