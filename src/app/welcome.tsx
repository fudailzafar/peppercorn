import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, BackHandler, FlatList, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { GoogleG } from '../components/GoogleG';
import { LogoMark, Logotype } from '../components/Logo';
import { Button } from '../components/material';
import { AddPreview, AssetsPreview, BudgetPreview, InsightsPreview } from '../components/OnboardingPreviews';
import { Haptics } from '../lib/haptics';
import { goBack } from '../lib/nav';
import { useStore, useUi } from '../lib/store';
import { shape } from '../theme/material';
import { useTheme } from '../theme/theme';

const PAGES = [
  { key: 'add', title: 'Add entries in seconds', text: 'Type an amount, tap a category, done.', Preview: AddPreview },
  { key: 'budget', title: 'Stay on budget', text: 'See what’s left, and what’s safe to spend each day.', Preview: BudgetPreview },
  { key: 'insights', title: 'See where it goes', text: 'How it compares, and what stands out.', Preview: InsightsPreview },
  { key: 'assets', title: 'Track your assets', text: 'Gold, silver and ethical funds, priced once a day.', Preview: AssetsPreview },
] as const;

const LAST = PAGES.length - 1;

/** The list's own page wrapper, as tall as the list. */
function Page({ children, onLayout }: { children?: ReactNode; onLayout?: (e: LayoutChangeEvent) => void }) {
  return (
    <View onLayout={onLayout} style={{ height: '100%' }}>
      {children}
    </View>
  );
}

/** First screen: four pages of what Peppercorn does. Next or Skip leads to the last, with the two ways in. */
export default function Welcome() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const update = useStore((s) => s.updateSettings);
  const showToast = useUi((s) => s.showToast);
  const list = useRef<FlatList>(null);
  const [width, setWidth] = useState(Math.min(window.width, 480));
  const [scrollX] = useState(() => new Animated.Value(0));
  const [page, setPage] = useState(0);

  const goTo = (next: number) => {
    Haptics.selection();
    list.current?.scrollToOffset({ offset: next * width, animated: true });
    setPage(next);
  };

  // Android's back button goes to the previous page; on the first it leaves the app, as there is nothing behind it.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page > 0) {
        list.current?.scrollToOffset({ offset: (page - 1) * width, animated: true });
        setPage(page - 1);
      } else BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, [page, width]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.max(0, Math.min(LAST, Math.round(e.nativeEvent.contentOffset.x / width))));

  const enter = () => {
    Haptics.light();
    update({ welcomed: true });
    goBack();
  };

  const last = page === LAST;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ flex: 1, backgroundColor: m3.surface, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) + 8 }}
    >
      <View style={styles.top}>
        <View style={styles.brand}>
          <LogoMark height={30} />
          <Logotype height={26} />
        </View>
        {last ? null : <Button variant="text" label="Skip" onPress={() => goTo(LAST)} />}
      </View>

      <Animated.FlatList
        ref={list}
        data={PAGES}
        keyExtractor={(p) => p.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumEnd}
        style={{ flex: 1 }}
        // A horizontal list doesn't stretch its pages by itself.
        contentContainerStyle={{ height: '100%' }}
        CellRendererComponent={Page}
        renderItem={({ item }) => (
          <View style={{ width, height: '100%', paddingHorizontal: 16 }}>
            <item.Preview />
            <View style={styles.copy}>
              <AppText variant="headlineMedium" accessibilityRole="header" style={{ textAlign: 'center' }}>
                {item.title}
              </AppText>
              <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={{ textAlign: 'center' }}>
                {item.text}
              </AppText>
            </View>
          </View>
        )}
      />

      {/* Page indicator: the current dot is a pill in the primary colour. */}
      <View style={styles.dots} accessible accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}>
        {PAGES.map((p, i) => {
          const input = [(i - 1) * width, i * width, (i + 1) * width];
          return (
            <Animated.View
              key={p.key}
              style={[
                styles.dot,
                {
                  width: scrollX.interpolate({ inputRange: input, outputRange: [8, 24, 8], extrapolate: 'clamp' }),
                  backgroundColor: scrollX.interpolate({ inputRange: input, outputRange: [m3.outlineVariant, m3.primary, m3.outlineVariant], extrapolate: 'clamp' }),
                },
              ]}
            />
          );
        })}
      </View>

      {/* The same height on every page, so nothing jumps on the last one. */}
      <View style={styles.actions}>
        {last ? (
          <>
            <Button large label="Continue without an account" onPress={enter} />
            <Button
              large
              variant="outlined"
              label="Continue with Google"
              leading={<GoogleG size={20} />}
              onPress={() => {
                Haptics.selection();
                showToast({ title: 'Google sign-in isn’t available yet. Continue without an account.', icon: 'logo-google', tone: 'info' }, 2200);
              }}
            />
            <AppText variant="bodySmall" color={m3.onSurfaceVariant} style={{ textAlign: 'center' }}>
              Your entries stay on this phone.
            </AppText>
          </>
        ) : (
          <Button large label="Next" onPress={() => goTo(page + 1)} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 4 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { minHeight: 124, justifyContent: 'center', gap: 8, paddingHorizontal: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, height: 8, marginBottom: 16 },
  dot: { height: 8, borderRadius: shape.full },
  actions: { paddingHorizontal: 16, gap: 8, minHeight: 144, justifyContent: 'flex-end' },
});
