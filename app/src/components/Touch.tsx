import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { StateLayer } from './m3';

interface Props extends Omit<PressableProps, 'children' | 'style' | 'accessibilityLabel'> {
  /** The colour it shows when pressed. */
  ink: string;
  label?: string;
  radius?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Something to tap, with Material's ripple and pressed tint. A button unless told otherwise. */
export function Touch({ ink, label, radius, children, style, ...rest }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} android_ripple={{ color: `${ink}1F` }} {...rest} style={style}>
      {({ pressed }) => (
        <>
          <StateLayer pressed={pressed} color={ink} radius={radius} />
          {children}
        </>
      )}
    </Pressable>
  );
}
