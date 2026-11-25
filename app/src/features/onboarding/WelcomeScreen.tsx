import { useEffect, useRef, useState } from 'react';
import { BackHandler, type FlatList, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleButton } from '@/features/account/GoogleButton';
import { problemText } from '@/features/account/words';
import { haptics } from '@/lib/haptics';
import { account, messages, store } from '@/state/app';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { LogoMark, Logotype } from '@/ui/Logo';
import { Button } from '@/ui/material';
import { AddPreview } from './AddPreview';
import { AssetsPreview } from './AssetsPreview';
import { BudgetPreview } from './BudgetPreview';
import { InsightsPreview } from './InsightsPreview';

const PAGES = [
  { key: 'add', title: 'Add entries in seconds', text: 'Type an amount, tap a category, done.', Preview: AddPreview },
  { key: 'budget', title: 'Stay on budget', text: 'See what’s left, and what’s safe to spend each day.', Preview: BudgetPreview },
  { key: 'insights', title: 'See where it goes', text: 'How it compares, and what stands out.', Preview: InsightsPreview },
  { key: 'assets', title: 'Track your assets', text: 'Gold, silver and ethical funds, priced once a day.', Preview: AssetsPreview },
] as const;

const LAST = PAGES.length - 1;

/** First screen: four pages of what Peppercorn does. Next or Skip leads to the last, with the two ways in. */
export function WelcomeScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const list = useRef<FlatList>(null);
  const [width, setWidth] = useState(Math.min(window.width, 480));
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });
  const [page, setPage] = useState(0);

  const goTo = (next: number) => {
    haptics.select();
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
    haptics.tap();
    void account.continueWithout();
    store.set({ welcomed: true });
  };

  const withGoogle = async () => {
    haptics.select();
    const problem = await account.signIn();
    if (problem && problem !== 'cancelled') messages.warn(problemText(problem));
  };

  const last = page === LAST;

  const picture = ({ item }: { item: (typeof PAGES)[number] }) => (
    <View style={[styles.tall, styles.page, { width }]}>
      <item.Preview />
      <View style={styles.copy}>
        <AppText variant="headlineMedium" accessibilityRole="header" style={styles.centred}>
          {item.title}
        </AppText>
        <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={styles.centred}>
          {item.text}
        </AppText>
      </View>
    </View>
  );

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.fill, { backgroundColor: m3.surface, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
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
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumEnd}
        style={styles.fill}
        // A horizontal list doesn't stretch its pages by itself.
        contentContainerStyle={styles.tall}
        CellRendererComponentStyle={styles.tall}
        renderItem={picture}
      />

      {/* Page indicator: the current dot is a pill in the primary colour. */}
      <View style={styles.dots} accessible accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}>
        {PAGES.map((p, i) => (
          <Dot key={p.key} index={i} x={x} width={width} />
        ))}
      </View>

      {/* The same height on every page, so nothing jumps on the last one. */}
      <View style={styles.actions}>
        {last ? (
          <>
            <Button large label="Continue without an account" onPress={enter} />
            <GoogleButton onPress={withGoogle} />
            <AppText variant="bodySmall" color={m3.onSurfaceVariant} style={styles.centred}>
              With Google, your data is saved to your Drive.
            </AppText>
          </>
        ) : (
          <Button large label="Next" onPress={() => goTo(page + 1)} />
        )}
      </View>
    </View>
  );
}

/** One page's dot, wider and in the primary colour the nearer its page is. */
function Dot({ index, x, width }: { index: number; x: SharedValue<number>; width: number }) {
  const { m3 } = useTheme();
  const { primary, outlineVariant } = m3;
  const style = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(x.get() / width - index));
    return { width: interpolate(near, [0, 1], [8, 24]), backgroundColor: interpolateColor(near, [0, 1], [outlineVariant, primary]) };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  tall: { height: '100%' },
  page: { paddingHorizontal: 16 },
  centred: { textAlign: 'center' },
  top: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 4 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { minHeight: 124, justifyContent: 'center', gap: 8, paddingHorizontal: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, height: 8, marginBottom: 16 },
  dot: { height: 8, borderRadius: shape.full },
  actions: { paddingHorizontal: 16, gap: 8, minHeight: 144, justifyContent: 'flex-end' },
});
