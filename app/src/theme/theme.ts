import { useColorScheme } from 'react-native';
import { useSettings } from '@/state/hooks';
import { m3Dark, m3Light, type M3Roles } from './material';

export interface Theme {
  dark: boolean;
  m3: M3Roles;
}

const LIGHT: Theme = { dark: false, m3: m3Light };
const DARK: Theme = { dark: true, m3: m3Dark };

/** The colours in use: the chosen theme, or the phone's. */
export function useTheme(): Theme {
  const chosen = useSettings().theme;
  const phone = useColorScheme();
  return (chosen === 'system' ? phone : chosen) === 'dark' ? DARK : LIGHT;
}

/** A "#RRGGBB" colour, see-through. */
export const withAlpha = (hex: string, alpha: number): string =>
  hex +
  Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
