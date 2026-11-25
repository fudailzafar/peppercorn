import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AccountChoice } from '@/features/account/AccountChoice';
import { LockedScreen } from '@/features/shell/LockedScreen';
import { useBadNews } from '@/features/shell/useBadNews';
import { useBrowserColours } from '@/features/shell/useBrowserColours';
import { startApp } from '@/state/app';
import { startClock } from '@/state/clock';
import { useAppState, useSettings } from '@/state/hooks';
import { useFontsReady } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';
import { Snackbar } from '@/ui/Snackbar';

export { ErrorScreen as ErrorBoundary } from '@/features/shell/ErrorScreen';

// The splash screen stays until there is something to show.
void SplashScreen.preventAutoHideAsync();

/** The whole app: its data is opened first, then its pages. */
export default function RootLayout() {
  const theme = useTheme();
  const { m3, dark } = theme;
  const fonts = useFontsReady();
  const status = useAppState((s) => s.status);
  const ready = fonts && status !== 'loading';

  useEffect(() => {
    const stops = [startApp(), startClock()];
    return () => stops.forEach((stop) => stop());
  }, []);
  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);
  useBadNews();
  useBrowserColours(theme);

  if (!ready) return <View style={[styles.fill, { backgroundColor: m3.surface }]} />;
  return (
    <GestureHandlerRootView style={[styles.fill, styles.phone, { backgroundColor: m3.surface }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {status === 'locked' ? <LockedScreen /> : <Pages />}
      <AccountChoice />
      <Snackbar />
    </GestureHandlerRootView>
  );
}

/** Pages that slide up over the one before. */
const overlay = { presentation: 'transparentModal', contentStyle: { backgroundColor: 'transparent' } } as const;

/** Every page but the welcome one needs it to be done. One that is in neither list could be opened without it. */
function Pages() {
  const { m3 } = useTheme();
  const { welcomed } = useSettings();
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: m3.surface } }}>
      <Stack.Protected guard={welcomed}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="entry" options={overlay} />
        <Stack.Screen name="edit-budget" options={overlay} />
        <Stack.Screen name="edit-category" options={overlay} />
        <Stack.Screen name="history" />
        <Stack.Screen name="search" />
        <Stack.Screen name="budget-page" />
        <Stack.Screen name="insight-category" />
        <Stack.Screen name="asset" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="choose" />
        <Stack.Screen name="currency" />
        <Stack.Screen name="week-month" />
      </Stack.Protected>
      <Stack.Protected guard={!welcomed}>
        <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // A phone's width on a wide screen.
  phone: Platform.OS === 'web' ? { width: '100%', maxWidth: 480, alignSelf: 'center' } : {},
});
