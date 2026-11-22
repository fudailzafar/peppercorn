import { View } from 'react-native';
import { currencySymbol } from '../lib/format';
import { AppText } from './AppText';

/**
 * The big headline number: a small grey sign and currency symbol, then large digits.
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
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: align, gap: 2 }}>
      {sign ? (
        <AppText size={size * 0.5} weight="medium" color="SubtitleText">
          {sign}
        </AppText>
      ) : null}
      <AppText size={size * 0.5} weight="medium" color="SubtitleText">
        {currencySymbol(currency)}
      </AppText>
      <AppText size={size} weight="medium" color={color} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
        {value}
      </AppText>
    </View>
  );
}
