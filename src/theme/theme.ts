import { useColorScheme } from 'react-native';
import { useStore } from '../lib/store';
import { darkColors, lightColors, type ColorName } from './tokens';

export type Palette = Record<ColorName, string>;

export interface Theme {
  dark: boolean;
  c: Palette;
}

/** Dime's colour palette for the current appearance (respects the Theme setting). */
export function useTheme(): Theme {
  const setting = useStore((s) => s.settings.theme);
  const system = useColorScheme();
  const dark = setting === 'dark' || (setting === 'system' && system === 'dark');
  return { dark, c: dark ? darkColors : lightColors };
}

/** "#RRGGBB" + alpha -> "rgba(r,g,b,a)". */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

export const fontFamily: Record<Weight, string> = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
};
