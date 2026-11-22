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
  const { c } = useTheme();
  const resolved = color in c ? c[color as keyof Palette] : color;
  return <Text {...rest} style={[{ fontFamily: fontFamily[weight], fontSize: size, color: resolved }, style]} />;
}
