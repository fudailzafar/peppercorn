import { View } from 'react-native';
import { currencySymbol } from '../lib/format';
import { AppText } from './AppText';

/**
 * The big headline amount, laid out the way money apps do it:
 *   - the currency symbol is smaller and lighter but sits on the same baseline as the digits;
 *   - a symbol that is really a code ("AED", "kr", "CHF") is set smaller still, so it never competes with the number;
 *   - the cents are set smaller than the whole part, so the eye reads "1,234" first;
 *   - digits are tabular, so a number does not jitter as you type.
 * Only income is tinted (green); everything else stays the normal text colour.
 */
export function BigAmount({
  value,
  sign,
  currency,
  size = 56,
  align = 'center',
  color = 'PrimaryText',
}: {
  value: string;
  sign?: '+' | '-' | '';
  currency: string;
  size?: number;
  align?: 'center' | 'flex-start' | 'flex-end';
  color?: 'PrimaryText' | 'IncomeGreen';
}) {
  const symbol = currencySymbol(currency);
  const isCode = symbol.length > 1;
  const dot = value.lastIndexOf('.');
  const whole = dot === -1 ? value : value.slice(0, dot);
  const cents = dot === -1 ? '' : value.slice(dot); // includes the point while typing "12."
  const small = size * (isCode ? 0.36 : 0.52);
  const tabular = { fontVariant: ['tabular-nums' as const] };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: align }}>
      {sign ? (
        <AppText size={small} weight="medium" color="SubtitleText" style={{ marginRight: size * 0.04 }}>
          {sign}
        </AppText>
      ) : null}
      <AppText size={small} weight="medium" color="SubtitleText" style={{ marginRight: size * (isCode ? 0.1 : 0.06) }}>
        {symbol}
      </AppText>
      <AppText size={size} weight="medium" color={color} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={tabular}>
        {whole}
      </AppText>
      {cents ? (
        <AppText size={size * 0.56} weight="medium" color={color === 'IncomeGreen' ? color : 'SubtitleText'} style={tabular}>
          {cents}
        </AppText>
      ) : null}
    </View>
  );
}
