import { goBack } from '../lib/nav';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { IconTile } from '../components/SettingsBits';
import { Haptics } from '../lib/haptics';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/theme';

const FEATURES: { icon: IconName; colour: string; title: string; text: string }[] = [
  { icon: 'receipt', colour: '#FE724E', title: 'Log in seconds', text: 'A simple number pad and your own categories keep entries quick.' },
  { icon: 'stats-chart', colour: '#279AF4', title: 'See where it goes', text: 'Insights break your spending down by day, week and category.' },
  { icon: 'grid', colour: '#6A7CF9', title: 'Stay on budget', text: 'Set an overall budget and one per category, and watch your pace.' },
];

export default function Welcome() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const update = useStore((s) => s.updateSettings);

  return (
    <View style={{ flex: 1, backgroundColor: c.PrimaryBackground, paddingTop: insets.top + 50, paddingHorizontal: 30, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
      <View style={{ alignItems: 'center' }}>
        <View style={[styles.logo, { backgroundColor: c.DarkBackground }]}>
          <Icon name="cash" size={42} color={c.LightIcon} />
        </View>
        <AppText size={14} weight="semibold" color="SubtitleText" style={{ marginTop: 22, letterSpacing: 1.5 }}>
          WELCOME TO
        </AppText>
        <AppText size={52} weight="bold">
          Dime
        </AppText>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', gap: 26 }}>
        {FEATURES.map((f) => (
          <View key={f.title} style={{ flexDirection: 'row', gap: 16 }}>
            <IconTile name={f.icon} colour={f.colour} />
            <View style={{ flex: 1 }}>
              <AppText size={21} weight="semibold">
                {f.title}
              </AppText>
              <AppText size={17} weight="medium" color="SubtitleText">
                {f.text}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => {
          Haptics.light();
          update({ welcomed: true });
          goBack();
        }}
        style={[styles.button, { backgroundColor: c.DarkBackground }]}
        accessibilityLabel="Get started"
      >
        <AppText size={21} weight="semibold" color="LightIcon">
          Get Started
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  button: { height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
