import { goBack } from '../lib/nav';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Icon, type IconName } from '../components/Icon';
import { FilledButton } from '../components/m3';
import { IconTile } from '../components/SettingsBits';
import { Haptics } from '../lib/haptics';
import { useStore } from '../lib/store';
import { shape, typeScale } from '../theme/material';
import { useTheme } from '../theme/theme';

const FEATURES: { icon: IconName; colour: string; title: string; text: string }[] = [
  { icon: 'receipt', colour: '#FE724E', title: 'Log in seconds', text: 'A simple number pad and your own categories keep entries quick.' },
  { icon: 'stats-chart', colour: '#279AF4', title: 'See where it goes', text: 'Insights break your spending down by day, week and category.' },
  { icon: 'grid', colour: '#6A7CF9', title: 'Stay on budget', text: 'Set an overall budget and one per category, and watch your pace.' },
];

export default function Welcome() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const update = useStore((s) => s.updateSettings);

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface, paddingTop: insets.top + 48, paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
      <View style={{ alignItems: 'center' }}>
        <View style={[styles.logo, { backgroundColor: m3.primary }]}>
          <Icon name="cash" size={44} color={m3.onPrimary} />
        </View>
        <AppText size={typeScale.labelLarge.size} weight="semibold" color={m3.onSurfaceVariant} style={{ marginTop: 24, letterSpacing: 1.5 }}>
          WELCOME TO
        </AppText>
        <AppText size={typeScale.displayMedium.size} color={m3.onSurface}>
          Dime
        </AppText>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
        {FEATURES.map((f) => (
          <View key={f.title} style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <IconTile name={f.icon} colour={f.colour} />
            <View style={{ flex: 1 }}>
              <AppText size={typeScale.titleMedium.size} weight="semibold" color={m3.onSurface}>
                {f.title}
              </AppText>
              <AppText size={typeScale.bodyMedium.size} color={m3.onSurfaceVariant} style={{ letterSpacing: typeScale.bodyMedium.tracking }}>
                {f.text}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <FilledButton
        label="Get started"
        onPress={() => {
          Haptics.light();
          update({ welcomed: true });
          goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 96, height: 96, borderRadius: shape.extraLarge, alignItems: 'center', justifyContent: 'center' },
});
