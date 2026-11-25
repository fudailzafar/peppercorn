import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { Empty } from '@/ui/Empty';
import { Button } from '@/ui/material';

/** In place of a page that failed. What is saved isn't touched by that, so it says so. */
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const { m3 } = useTheme();
  useEffect(() => {
    SplashScreen.hide();
    console.error(error);
  }, [error]);
  return (
    <View style={[styles.centred, { backgroundColor: m3.surface }]}>
      <Empty icon="alert-circle" title="Something went wrong" text="Your data is safe. Try again, or close Peppercorn and open it again.">
        <Button label="Try again" onPress={() => void retry()} />
      </Empty>
    </View>
  );
}

const styles = StyleSheet.create({ centred: { flex: 1, justifyContent: 'center' } });
