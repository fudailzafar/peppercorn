import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { symbolOf } from '../domain/money';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

interface Props {
  /** "1,240.50", without the symbol. */
  digits: string;
  currency: string;
  size?: number;
  sign?: '+' | '-' | '';
  centred?: boolean;
  /** Income is green. Nothing else is tinted. */
  income?: boolean;
  /** A unit after the number, in place of the symbol: "g". */
  unit?: string;
}

/** A headline amount: big digits with a small symbol and small cents. It shrinks rather than run off the edge. */
export function BigAmount({ digits, currency, size = 48, sign = '', centred = false, income = false, unit }: Props) {
  const { m3 } = useTheme();
  const [room, setRoom] = useState(0);
  const [wide, setWide] = useState(0);
  const symbol = symbolOf(currency);
  const [whole, cents] = digits.split('.');
  const ink = income ? m3.success : m3.onSurface;
  // A code such as "CHF" is wide, so it is smaller than a symbol.
  const small = size * (symbol.length > 1 ? 0.36 : 0.52);
  const scale = room > 0 && wide > room ? room / wide : 1;
  const part = (words: string, at: number, color: string, gap?: { marginLeft?: number; marginRight?: number }) => (
    <AppText size={at * scale} color={color} numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.digits, gap]}>
      {words}
    </AppText>
  );
  return (
    <View style={styles.box} onLayout={(e) => setRoom(e.nativeEvent.layout.width)} accessible accessibilityLabel={`${sign}${unit ? '' : symbol}${digits}${unit ? ` ${unit}` : ''}`}>
      {/* The same thing at full size, unseen, to know how wide it would be. */}
      <View style={styles.ruler} pointerEvents="none" aria-hidden>
        <View
          style={styles.line}
          onLayout={(e) => setWide(e.nativeEvent.layout.width)}
        >
          <AppText size={small} maxFontSizeMultiplier={1.3} style={styles.digits}>
            {sign + (unit ?? symbol) + ' '}
          </AppText>
          <AppText size={size} maxFontSizeMultiplier={1.3} style={styles.digits}>
            {whole}
          </AppText>
          <AppText size={size * 0.56} maxFontSizeMultiplier={1.3} style={styles.digits}>
            {cents === undefined ? '' : `.${cents}`}
          </AppText>
        </View>
      </View>
      <View style={[styles.line, centred && styles.centred, { minHeight: size * 1.18 }]} importantForAccessibility="no-hide-descendants">
        {sign ? part(sign, small, m3.onSurfaceVariant, { marginRight: 2 }) : null}
        {unit ? null : part(symbol, small, m3.onSurfaceVariant, { marginRight: size * (symbol.length > 1 ? 0.1 : 0.06) })}
        {part(whole, size, ink)}
        {cents === undefined ? null : part(`.${cents}`, size * 0.56, income ? ink : m3.onSurfaceVariant)}
        {unit ? part(unit, size * 0.52, m3.onSurfaceVariant, { marginLeft: size * 0.1 }) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'stretch', overflow: 'hidden' },
  ruler: { position: 'absolute', opacity: 0, width: 4000, flexDirection: 'row' },
  line: { flexDirection: 'row', alignItems: 'baseline' },
  centred: { justifyContent: 'center' },
  digits: { fontVariant: ['tabular-nums'] },
});
