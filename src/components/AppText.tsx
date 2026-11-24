import { Text, type TextProps } from 'react-native';
import { typeScale, type TypeName } from '../theme/material';
import { fontFamily, useTheme, type Weight } from '../theme/theme';

interface Props extends TextProps {
  /** An M3 type role: sets size, line height, tracking and weight together. */
  variant?: TypeName;
  /** Only for text outside the type scale (emoji, the big amount). */
  size?: number;
  weight?: Weight;
  color?: string;
}

const ROLE_WEIGHT: Record<(typeof typeScale)[TypeName]['weight'], Weight> = { regular: 'regular', medium: 'semibold' };

/** Text in an M3 type role. */
export function AppText({ variant, size, weight, color, style, ...rest }: Props) {
  const { m3 } = useTheme();
  const role = variant ? typeScale[variant] : undefined;
  const face = fontFamily[weight ?? (role ? ROLE_WEIGHT[role.weight] : 'regular')];
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: face, color: color ?? m3.onSurface },
        role ? { fontSize: role.size, lineHeight: role.lineHeight, letterSpacing: role.tracking } : { fontSize: size ?? typeScale.bodyLarge.size },
        style,
      ]}
    />
  );
}
