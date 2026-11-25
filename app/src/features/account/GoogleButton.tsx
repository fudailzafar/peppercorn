import { Image, Pressable, StyleSheet } from 'react-native';
import { useAccount } from '@/state/hooks';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { StateLayer } from '@/ui/material';

// Google's own button colours and "G": https://developers.google.com/identity/branding-guidelines
const GOOGLE = {
  light: { fill: '#FFFFFF', stroke: '#747775', text: '#1F1F1F' },
  dark: { fill: '#131314', stroke: '#8E918F', text: '#E3E3E3' },
};

/** Google's sign-in button, to its branding rules. */
export function GoogleButton({ onPress }: { onPress: () => void }) {
  const { dark } = useTheme();
  const busy = useAccount((s) => s.busy === 'signingIn');
  const c = GOOGLE[dark ? 'dark' : 'light'];
  const label = busy ? 'Signing in…' : 'Continue with Google';
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      android_ripple={{ color: `${c.text}1F` }}
      style={[styles.google, { backgroundColor: c.fill, borderColor: c.stroke }]}
    >
      {({ pressed }) => (
        <>
          <StateLayer pressed={pressed} color={c.text} radius={shape.full} />
          <Image source={require('@assets/google-g.png')} style={styles.g} accessible={false} />
          <AppText variant="titleMedium" color={c.text}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  google: { height: 56, borderRadius: shape.full, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24, overflow: 'hidden' },
  g: { width: 24, height: 24 },
});
