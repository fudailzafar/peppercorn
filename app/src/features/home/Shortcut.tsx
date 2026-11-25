import { StyleSheet } from 'react-native';
import { haptics } from '@/lib/haptics';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import type { IconName } from '@/ui/Icon';
import { IconAvatar } from '@/ui/material';
import { Touch } from '@/ui/Touch';

export function Shortcut({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { m3 } = useTheme();
  return (
    <Touch
      ink={m3.onSurface}
      radius={shape.large}
      label={label.replace('\n', ' ')}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={styles.shortcut}
    >
      <IconAvatar icon={icon} size={56} />
      <AppText variant="labelMedium" maxFontSizeMultiplier={1.3} style={styles.shortcutText}>
        {label}
      </AppText>
    </Touch>
  );
}

const styles = StyleSheet.create({
  shortcut: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 12, borderRadius: shape.large, overflow: 'hidden' },
  shortcutText: { textAlign: 'center' },
});
