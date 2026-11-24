import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { Button } from '../components/material';
import { BudgetArt, GoogleG, InsightsArt, LogArt, PrivateArt } from '../components/OnboardingArt';
import { Haptics } from '../lib/haptics';
import { goBack } from '../lib/nav';
import { useStore, useUi } from '../lib/store';
import { radius, shape } from '../theme/material';
import { useTheme, withAlpha } from '../theme/theme';

const SLIDES = [
  { key: 'log', tint: '#FE724E', title: 'Add entries in seconds', text: 'A big number pad and your own categories keep it quick.', Art: LogArt },
  { key: 'insights', tint: '#279AF4', title: 'See where it goes', text: 'Insights break your spending down by day, week, month and category.', Art: InsightsArt },
  { key: 'budget', tint: '#6A7CF9', title: 'Stay on budget', text: 'Set an overall budget and one per category, and watch your pace.', Art: BudgetArt },
  { key: 'private', tint: '#76FBB1', title: 'Yours, on your device', text: 'No account needed. Your entries stay on this phone.', Art: PrivateArt },
] as const;

const GAP = 12;
const SIDE = 20;
const AUTO_MS = 4500;

/**
 * First screen: a slideshow of illustrated cards you can swipe sideways (the next card peeks in from the right),
 * then two ways in: Google (not wired up yet) or continuing locally with no account.
 */
export default function Welcome() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const update = useStore((s) => s.updateSettings);
  const showToast = useUi((s) => s.showToast);
  const list = useRef<FlatList>(null);
  const [scrollX] = useState(() => new Animated.Value(0));
  const [index, setIndex] = useState(0);
  const touching = useRef(false);

  const cardW = Math.min(width - SIDE * 2 - 28, 360);
  const step = cardW + GAP;

  const onEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, Math.round(e.nativeEvent.contentOffset.x / step))));
  }, [step]);

  // Advance by itself every few seconds, and loop; stop while a finger is on the carousel.
  useEffect(() => {
    const id = setInterval(() => {
      if (touching.current) return;
      const next = (index + 1) % SLIDES.length;
      list.current?.scrollToOffset({ offset: next * step, animated: true });
      setIndex(next);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [index, step]);

  const enter = () => {
    Haptics.light();
    update({ welcomed: true });
    goBack();
  };

  const bottom = Math.max(insets.bottom, 16) + 8;

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface, paddingTop: insets.top + 16 }}>
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: m3.primary }]}>
          <Icon name="cash" size={22} color={m3.onPrimary} />
        </View>
        <AppText variant="titleLarge" color={m3.onSurface}>
          Dime
        </AppText>
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Animated.FlatList
          ref={list}
          data={SLIDES}
          keyExtractor={(s) => s.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP }}
          style={{ flexGrow: 0 }}
          onScrollBeginDrag={() => { touching.current = true; }}
          onScrollEndDrag={() => { touching.current = false; }}
          onMomentumScrollEnd={onEnd}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={[styles.card, { width: cardW, backgroundColor: withAlpha(item.tint, 0.14) }]}>
              <View style={styles.art}>
                <item.Art c={m3} accent={item.tint} />
              </View>
              <AppText variant="headlineSmall" color={m3.onSurface} style={{ marginTop: 8 }}>
                {item.title}
              </AppText>
              <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={{ marginTop: 6 }}>
                {item.text}
              </AppText>
            </View>
          )}
        />

        {/* Page dots: the active one stretches into a pill as you swipe. */}
        <View style={styles.dots}>
          {SLIDES.map((s, i) => {
            const input = [(i - 1) * step, i * step, (i + 1) * step];
            const w = scrollX.interpolate({ inputRange: input, outputRange: [8, 24, 8], extrapolate: 'clamp' });
            const o = scrollX.interpolate({ inputRange: input, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' });
            return <Animated.View key={s.key} style={[styles.dot, { width: w, opacity: o, backgroundColor: m3.onSurface }]} />;
          })}
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: bottom, gap: 12 }}>
        <Button
          large
          label="Continue with Google"
          leading={
            <View style={styles.gBadge}>
              <GoogleG size={18} />
            </View>
          }
          onPress={() => {
            Haptics.selection();
            showToast({ title: 'Google sign-in isn’t available yet. Continue without an account.', icon: 'logo-google', tone: 'info' }, 2200);
          }}
        />

        <Button large variant="tonal" icon="phone-portrait-outline" label="Continue without an account" onPress={enter} />

        <AppText variant="bodySmall" color={m3.onSurfaceVariant} style={{ textAlign: 'center' }}>
          Your entries stay on this phone.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingBottom: 12 },
  logo: { width: 36, height: 36, borderRadius: radius.key, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.hero, padding: 20, paddingBottom: 24 },
  art: { height: 210, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20, height: 8 },
  dot: { height: 8, borderRadius: shape.full },
  gBadge: { width: 28, height: 28, borderRadius: shape.full, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
