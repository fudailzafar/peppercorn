import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { Empty } from '@/ui/Empty';
import { Button } from '@/ui/material';

/** For an address that leads nowhere. */
export function NotFoundScreen() {
  const { m3 } = useTheme();
  return (
    <View style={[styles.centred, { backgroundColor: m3.surface }]}>
      <Empty icon="search" title="Page not found" text="There’s nothing at this address.">
        <Button label="Go to Home" onPress={() => router.replace('/')} />
      </Empty>
    </View>
  );
}

const styles = StyleSheet.create({ centred: { flex: 1, justifyContent: 'center' } });
