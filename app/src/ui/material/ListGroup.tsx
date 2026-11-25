import { Children, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';

/** M3 segmented list: rows share one group, with large outer corners and a hairline gap between them. */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { m3 } = useTheme();
  const rows = Children.toArray(children);
  return (
    <View style={[{ marginHorizontal: 16, gap: 2 }, style]}>
      {rows.map((row, i) => {
        const top = i === 0 ? shape.large : shape.extraSmall;
        const bottom = i === rows.length - 1 ? shape.large : shape.extraSmall;
        return (
          <View key={i} style={{ backgroundColor: m3.surfaceContainer, overflow: 'hidden', borderTopLeftRadius: top, borderTopRightRadius: top, borderBottomLeftRadius: bottom, borderBottomRightRadius: bottom }}>
            {row}
          </View>
        );
      })}
    </View>
  );
}
