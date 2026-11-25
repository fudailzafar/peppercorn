import { GoogleSans_400Regular, GoogleSans_500Medium, GoogleSans_700Bold, useFonts } from '@expo-google-fonts/google-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AccountChoice } from '../components/Account';
import { Empty } from '../components/Empty';
import { Button } from '../components/material';
import { Snackbar } from '../components/Snackbar';
import { messages, startApp, store } from '../data/app';
import { useAppState } from '../data/hooks';
import { useTheme } from '../theme/theme';

/** Says it again this often while nothing can be saved. */
const REMIND = 8000;

/** The whole app: its data is opened first, then its pages. */
export default function RootLayout() {
  const { m3, dark } = useTheme();
  const [fonts, fontError] = useFonts({ GoogleSans_400Regular, GoogleSans_500Medium, GoogleSans_700Bold });
  const status = useAppState((s) => s.status);

  useEffect(startApp, []);
  useBadNews();
  useBrowser(m3.surface, dark);

  if (status === 'loading' || (!fonts && !fontError)) return <View style={[styles.fill, { backgroundColor: m3.surface }]} />;

  const overlay = { presentation: 'transparentModal', contentStyle: styles.clear } as const;
  return (
    <GestureHandlerRootView style={[styles.fill, styles.phone, { backgroundColor: m3.surface }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {status === 'locked' ? (
        <Locked />
      ) : (
        <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: m3.surface } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="entry" options={overlay} />
          <Stack.Screen name="edit-budget" options={overlay} />
          <Stack.Screen name="edit-category" options={overlay} />
          <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
        </Stack>
      )}
      <AccountChoice />
      <Snackbar />
    </GestureHandlerRootView>
  );
}

/** In place of the app while its data can't be opened: carrying on without it would write over it. */
function Locked() {
  const retry = async () => {
    if (!(await store.open())) messages.warn('Still couldn’t open it.');
  };
  return (
    <View style={[styles.fill, styles.centred]}>
      <Empty icon="alert-circle" title="Couldn’t open your data" text="It’s still on this phone, and nothing has been changed. Try again, or restart your phone.">
        <Button label="Try again" onPress={retry} />
      </Empty>
    </View>
  );
}

/** What has to be said about the data on this phone, for as long as it's true. */
function useBadNews() {
  const unsaved = useAppState((s) => s.unsaved);
  const recovered = useAppState((s) => s.recovered);
  useEffect(() => {
    if (recovered) messages.warn('Your saved data couldn’t be read. A copy was kept on this phone.');
  }, [recovered]);
  useEffect(() => {
    if (!unsaved) return;
    const say = () => messages.warn('Couldn’t save on this phone. Free up some space.');
    say();
    const timer = setInterval(say, REMIND);
    return () => clearInterval(timer);
  }, [unsaved]);
}

/** On the web, what is around the app has its colours too. */
function useBrowser(colour: string, dark: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const page = document.documentElement;
    page.style.colorScheme = dark ? 'dark' : 'light';
    page.style.backgroundColor = colour;
    document.body.style.backgroundColor = colour;
    for (const tag of document.querySelectorAll('meta[name="theme-color"]')) tag.setAttribute('content', colour);
  }, [colour, dark]);
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centred: { justifyContent: 'center' },
  clear: { backgroundColor: 'transparent' },
  // A phone's width on a wide screen.
  phone: Platform.OS === 'web' ? { width: '100%', maxWidth: 480, alignSelf: 'center' } : {},
});
