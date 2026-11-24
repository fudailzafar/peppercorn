import { useColorScheme } from 'react-native';
import { useStore } from '../lib/store';
import { m3Dark, m3Light, type M3Roles } from './material';

export interface Theme {
  dark: boolean;
  /** Material 3 colour roles. */
  m3: M3Roles;
}

/** The Material 3 colour roles for the current appearance (respects the Theme setting). */
export function useTheme(): Theme {
  const setting = useStore((s) => s.settings.theme);
  const system = useColorScheme();
  const dark = setting === 'dark' || (setting === 'system' && system === 'dark');
  return { dark, m3: dark ? m3Dark : m3Light };
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

/** Google Sans. M3 uses regular and medium (500, "semibold" here); bold is for rare emphasis. */
export const fontFamily: Record<Weight, string> = {
  regular: 'GoogleSans_400Regular',
  medium: 'GoogleSans_400Regular',
  semibold: 'GoogleSans_500Medium',
  bold: 'GoogleSans_700Bold',
};
