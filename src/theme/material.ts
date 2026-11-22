/**
 * Material Design 3 for Dime: the structure of M3 (colour roles, type scale, shapes, motion, elevation)
 * filled with Dime's own brand colours instead of a generated tonal palette.
 * Reference: https://m3.material.io/styles
 */

// MARK: Colour roles

export interface M3Roles {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  /** Income, kept as Dime's green. */
  success: string;
  successContainer: string;
  surface: string;
  surfaceDim: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  scrim: string;
}

/** Dime's palette arranged as M3 roles (light). Graphite is the primary, as in the original app. */
export const m3Light: M3Roles = {
  primary: '#3C3C3C',
  onPrimary: '#FFFFFF',
  primaryContainer: '#E4E4E4',
  onPrimaryContainer: '#1C1C1C',
  secondaryContainer: '#E8E8EA',
  onSecondaryContainer: '#1C1C1C',
  tertiary: '#6F6F76',
  error: '#FE473A',
  onError: '#FFFFFF',
  errorContainer: '#FDECED',
  onErrorContainer: '#8C1D18',
  success: '#03CD86',
  successContainer: '#D8F7EA',
  surface: '#FFFFFF',
  surfaceDim: '#EDEDED',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#FBFBFB',
  surfaceContainer: '#F6F6F6',
  surfaceContainerHigh: '#F0F0F0',
  surfaceContainerHighest: '#E9E9E9',
  onSurface: '#1B1B1B',
  onSurfaceVariant: '#6E6E73',
  outline: '#A6A6A6',
  outlineVariant: '#E3E6EA',
  inverseSurface: '#303030',
  inverseOnSurface: '#F4F4F4',
  scrim: '#000000',
};

export const m3Dark: M3Roles = {
  primary: '#FFFFFF',
  onPrimary: '#232626',
  primaryContainer: '#3A3A3C',
  onPrimaryContainer: '#F4F4F4',
  secondaryContainer: '#3A3A3C',
  onSecondaryContainer: '#F4F4F4',
  tertiary: '#B5B5BB',
  error: '#FE473A',
  onError: '#FFFFFF',
  errorContainer: '#4A1B18',
  onErrorContainer: '#FFD9D5',
  success: '#0FFFA9',
  successContainer: '#0B3A2B',
  surface: '#060A07',
  surfaceDim: '#060A07',
  surfaceContainerLowest: '#030504',
  surfaceContainerLow: '#101311',
  surfaceContainer: '#161917',
  surfaceContainerHigh: '#1F2220',
  surfaceContainerHighest: '#2A2D2B',
  onSurface: '#EDEDED',
  onSurfaceVariant: '#A8A8AD',
  outline: '#767676',
  outlineVariant: '#2E2E2E',
  inverseSurface: '#E6E6E6',
  inverseOnSurface: '#2B2B2B',
  scrim: '#000000',
};

// MARK: Type scale (Roboto)

export interface TypeRole {
  size: number;
  lineHeight: number;
  /** Letter spacing in px (M3 lists it in sp). */
  tracking: number;
  weight: 'regular' | 'medium' | 'bold';
}

export const typeScale = {
  displayLarge: { size: 57, lineHeight: 64, tracking: -0.25, weight: 'regular' },
  displayMedium: { size: 45, lineHeight: 52, tracking: 0, weight: 'regular' },
  displaySmall: { size: 36, lineHeight: 44, tracking: 0, weight: 'regular' },
  headlineLarge: { size: 32, lineHeight: 40, tracking: 0, weight: 'regular' },
  headlineMedium: { size: 28, lineHeight: 36, tracking: 0, weight: 'regular' },
  headlineSmall: { size: 24, lineHeight: 32, tracking: 0, weight: 'regular' },
  titleLarge: { size: 22, lineHeight: 28, tracking: 0, weight: 'regular' },
  titleMedium: { size: 16, lineHeight: 24, tracking: 0.15, weight: 'medium' },
  titleSmall: { size: 14, lineHeight: 20, tracking: 0.1, weight: 'medium' },
  bodyLarge: { size: 16, lineHeight: 24, tracking: 0.5, weight: 'regular' },
  bodyMedium: { size: 14, lineHeight: 20, tracking: 0.25, weight: 'regular' },
  bodySmall: { size: 12, lineHeight: 16, tracking: 0.4, weight: 'regular' },
  labelLarge: { size: 14, lineHeight: 20, tracking: 0.1, weight: 'medium' },
  labelMedium: { size: 12, lineHeight: 16, tracking: 0.5, weight: 'medium' },
  labelSmall: { size: 11, lineHeight: 16, tracking: 0.5, weight: 'medium' },
} as const satisfies Record<string, TypeRole>;

export type TypeName = keyof typeof typeScale;

// MARK: Shape

export const shape = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 999,
} as const;

// MARK: State layers and elevation

/** Opacity of the overlay painted over a component for each interaction state. */
export const stateLayer = { hover: 0.08, focus: 0.1, pressed: 0.1, dragged: 0.16 } as const;

/** Elevation levels 0-5 as RN shadow props (iOS) plus `elevation` (Android). */
export const elevation = (level: 0 | 1 | 2 | 3 | 4 | 5) => {
  const dp = [0, 1, 3, 6, 8, 12][level];
  return {
    elevation: dp,
    shadowColor: '#000',
    shadowOpacity: level === 0 ? 0 : 0.14 + level * 0.01,
    shadowRadius: dp * 1.2,
    shadowOffset: { width: 0, height: Math.ceil(dp / 2) },
  };
};

// MARK: Motion

/** Bezier control points for M3's easing curves (RN's Easing.bezier takes them as four numbers). */
export const m3Easing = {
  standard: [0.2, 0, 0, 1],
  standardDecelerate: [0, 0, 0, 1],
  standardAccelerate: [0.3, 0, 1, 1],
  emphasized: [0.2, 0, 0, 1],
  emphasizedDecelerate: [0.05, 0.7, 0.1, 1],
  emphasizedAccelerate: [0.3, 0, 0.8, 0.15],
} as const;

/** M3 duration tokens in ms. */
export const m3Duration = { short2: 100, short3: 150, short4: 200, medium1: 250, medium2: 300, medium4: 400, long2: 500 } as const;
