import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, useFonts } from '@expo-google-fonts/roboto';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { ToastHost } from '../components/Overlays';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/theme';

function useHydrated() {
  return useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}

export default function RootLayout() {
  const hydrated = useHydrated();
  const [fontsLoaded, fontError] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold });
  const { m3, dark } = useTheme();

  // Once the saved data is loaded: create default categories on first run, then
  // log any recurring transactions that came due and roll budget periods forward.
  useEffect(() => {
    if (!hydrated) return;
    const { seedDefaults, runRecurring, rollBudgets } = useStore.getState();
    seedDefaults();
    runRecurring();
    rollBudgets();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        useStore.getState().runRecurring();
        useStore.getState().rollBudgets();
      }
    });
    return () => sub.remove();
  }, [hydrated]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // Keep the browser chrome and page background in step with the app's theme (system or manual).
    document.documentElement.style.backgroundColor = m3.surface;
    document.body.style.backgroundColor = m3.surface;
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', m3.surface));
  }, [m3.surface, dark]);

  if (!hydrated || (!fontsLoaded && !fontError)) return null;

  return (
    <GestureHandlerRootView style={webFrame(m3.surface)}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: m3.surface },
          // Pushing a page (Categories, Currency, Budget detail...) slides it in from the right; back slides it out.
          animation: 'slide_from_right',
          animationDuration: 300,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="transaction" options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="search" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="new-budget" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="category-edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="welcome" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
      <ToastHost />
    </GestureHandlerRootView>
  );
}

/** On desktop browsers keep the app a phone-width column instead of stretching edge to edge. */
function webFrame(background: string) {
  // On native too: without a background the window's own white shows through between screens in dark mode.
  if (Platform.OS !== 'web') return { flex: 1, backgroundColor: background } as const;
  return { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: background } as const;
}
