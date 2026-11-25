import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { Card } from '@/ui/material';

export function PreviewFrame({ children }: { children: ReactNode }) {
  const { m3, dark } = useTheme();
  // On a short screen the picture is scaled down to fit rather than clipped.
  const [room, setRoom] = useState(0);
  const [needed, setNeeded] = useState(0);
  const scale = room > 0 && needed > 0 ? Math.min(1, (room - 32) / needed) : 1;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      onLayout={(e) => setRoom(e.nativeEvent.layout.height)}
      style={[styles.frame, { backgroundColor: dark ? m3.surfaceContainerHigh : m3.primaryContainer }]}
    >
      <View onLayout={(e) => setNeeded(e.nativeEvent.layout.height)} style={[styles.inner, { transform: [{ scale }] }]}>
        {children}
      </View>
    </View>
  );
}

export function Surface({ children, hero = false, padded = true }: { children: ReactNode; hero?: boolean; padded?: boolean }) {
  const { m3 } = useTheme();
  return (
    <Card hero={hero} style={{ backgroundColor: m3.surface, padding: padded ? 16 : 0 }}>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, borderRadius: shape.extraLarge, overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 20 },
  inner: { gap: 12, width: '100%', maxWidth: 340, alignSelf: 'center' },
});
