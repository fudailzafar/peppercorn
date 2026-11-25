import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { messages } from '@/state/app';
import { useMessage } from '@/state/hooks';
import { elevation, m3Duration, shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { AppText } from './AppText';
import { Touch } from './Touch';

/** Clear of the navigation bar and the add button above it. */
const ABOVE = 168;

/** The line at the bottom of the screen. A tap sends it away. */
export function Snackbar() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const message = useMessage();
  if (!message) return null;
  const { text, error, undo } = message;
  return (
    <View pointerEvents="box-none" style={[styles.place, { bottom: insets.bottom + ABOVE }]}>
      <Animated.View key={text} entering={FadeInDown.duration(m3Duration.short4)} exiting={FadeOutDown.duration(m3Duration.short3)} style={[styles.bar, elevation(3), { backgroundColor: m3.inverseSurface }]}>
        <Touch onPress={() => messages.dismiss()} ink={m3.inverseOnSurface} label={text} style={styles.words}>
          {error ? <View style={[styles.dot, { backgroundColor: m3.error }]} /> : null}
          <AppText variant="bodyMedium" color={m3.inverseOnSurface} accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.text}>
            {text}
          </AppText>
        </Touch>
        {undo ? (
          <Touch
            onPress={() => {
              undo();
              messages.dismiss();
            }}
            ink={m3.inversePrimary}
            label="Undo"
            style={styles.undo}
          >
            <AppText variant="labelLarge" color={m3.inversePrimary}>
              Undo
            </AppText>
          </Touch>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  place: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 10 },
  bar: { flexDirection: 'row', width: '100%', maxWidth: 560, minHeight: 48, borderRadius: shape.extraSmall, overflow: 'hidden' },
  words: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  text: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: shape.full },
  undo: { minWidth: 72, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
