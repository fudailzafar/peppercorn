import { Text, type TextProps } from 'react-native';
import { fontFamily, useTheme, type Palette, type Weight } from '../theme/theme';
import type { ColorName } from '../theme/tokens';

interface Props extends TextProps {
  size?: number;
  weight?: Weight;
  /** A palette colour name, or a literal colour. */
  color?: ColorName | (string & {});
}

/** Text in Roboto (Material's typeface). Sizes are Dime's; see theme/material.ts for the M3 type roles. */
export function AppText({ size = 17, weight = 'medium', color = 'PrimaryText', style, ...rest }: Props) {
  const { c, m3 } = useTheme();
  // Dime's named text colours resolve to their Material 3 roles, which keep proper contrast.
  const named: Partial<Record<ColorName, string>> = {
    PrimaryText: m3.onSurface,
    SubtitleText: m3.onSurfaceVariant,
    EvenLighterText: m3.outline,
    DarkIcon: m3.onSurface,
    IncomeGreen: m3.success,
    AlertRed: m3.error,
  };
  const resolved = named[color as ColorName] ?? (color in c ? c[color as keyof Palette] : color);
  return <Text {...rest} style={[{ fontFamily: fontFamily[weight], fontSize: size, color: resolved }, style]} />;
}
