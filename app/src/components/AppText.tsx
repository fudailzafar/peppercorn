import { Text, type TextProps } from 'react-native';
import { typeScale, type TypeName } from '../theme/material';
import { FONTS, useTheme, type Weight } from '../theme/theme';

interface Props extends TextProps {
  /** A role of Material's type scale. */
  variant?: TypeName;
  /** For what the scale doesn't cover: an emoji, the big amount. */
  size?: number;
  weight?: Weight;
  color?: string;
}

/** All the app's words. */
export function AppText({ variant, size = typeScale.bodyLarge.size, weight, color, style, ...rest }: Props) {
  const { m3 } = useTheme();
  const role = variant && typeScale[variant];
  const metrics = role ? { fontSize: role.size, lineHeight: role.lineHeight, letterSpacing: role.tracking } : { fontSize: size };
  return <Text {...rest} style={[metrics, { fontFamily: FONTS[weight ?? role?.weight ?? 'regular'], color: color ?? m3.onSurface }, style]} />;
}
