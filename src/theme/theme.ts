import { useColorScheme } from 'react-native';
import { useStore } from '../lib/store';
import { m3Dark, m3Light, type M3Roles } from './material';
import { darkColors, lightColors, type ColorName } from './tokens';

export type Palette = Record<ColorName, string>;

export interface Theme {
  dark: boolean;
  /** Dime's brand palette (kept so every screen keeps working). */
  c: Palette;
  /** The same colours arranged as Material 3 roles. */
  m3: M3Roles;
}

/** Dime's colour palette for the current appearance (respects the Theme setting). */
export function useTheme(): Theme {
  const setting = useStore((s) => s.settings.theme);
  const system = useColorScheme();
  const dark = setting === 'dark' || (setting === 'system' && system === 'dark');
  return { dark, c: dark ? darkColors : lightColors, m3: dark ? m3Dark : m3Light };
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

/**
 * Roboto, Material's typeface. Dime's four weights fold onto Roboto's three:
 * body text (regular/medium) is Regular, emphasis (semibold) is Medium, headings (bold) are Bold.
 */
export const fontFamily: Record<Weight, string> = {
  regular: 'Roboto_400Regular',
  medium: 'Roboto_400Regular',
  semibold: 'Roboto_500Medium',
  bold: 'Roboto_700Bold',
};
