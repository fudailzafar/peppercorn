import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/theme/theme';

/*
 * Peppercorn's symbol and logotype. Every letter is drawn from one ring and one stroke; the symbol is a "p" whose bowl
 * holds a single grain, and the same grain sits in the logotype's "o". Sources: assets/brand.
 */
const GRAIN = { light: '#F29900', dark: '#FDD663' } as const;
const WORD = 'M5 34V86M37 50A16 16 0 1 1 5 50A16 16 0 1 1 37 50M52 50H84A16 16 0 1 0 78.71 61.89M102 34V86M134 50A16 16 0 1 1 102 50A16 16 0 1 1 134 50M152 34V86M184 50A16 16 0 1 1 152 50A16 16 0 1 1 184 50M199 50H231A16 16 0 1 0 225.71 61.89M249 34V66M249 48A14 14 0 0 1 263 34M301.71 38.11A16 16 0 1 0 301.71 61.89M345.71 50A16 16 0 1 1 313.71 50A16 16 0 1 1 345.71 50M363.71 34V66M363.71 48A14 14 0 0 1 377.71 34M392.71 34V66M392.71 48A14 14 0 0 1 420.71 48V66';
const WORD_WIDTH = 425.71;

/** The symbol on its own. */
export function LogoMark({ height = 32 }: { height?: number }) {
  const { m3, dark } = useTheme();
  return (
    <View aria-hidden>
      <Svg width={(height * 52) / 74} height={height} viewBox="27 15 52 74">
        <Path d="M33 41V83" stroke={m3.primary} strokeWidth={12} strokeLinecap="round" fill="none" />
        <Circle cx={53} cy={41} r={20} stroke={m3.primary} strokeWidth={12} fill="none" />
        <Circle cx={53} cy={41} r={7.5} fill={dark ? GRAIN.dark : GRAIN.light} />
      </Svg>
    </View>
  );
}

/** The name, drawn. `height` is the full height, descenders included. */
export function Logotype({ height = 28 }: { height?: number }) {
  const { m3, dark } = useTheme();
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Peppercorn">
      <Svg width={(height * WORD_WIDTH) / 62} height={height} viewBox={`0 29 ${WORD_WIDTH} 62`}>
        <Path d={WORD} stroke={m3.onSurface} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Circle cx={329.71} cy={50} r={5} fill={dark ? GRAIN.dark : GRAIN.light} />
      </Svg>
    </View>
  );
}
