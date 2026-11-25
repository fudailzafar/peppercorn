/**
 * Material Design 3 for Peppercorn: the structure of M3 (colour roles, type scale, shapes, motion, elevation)
 * with a blue primary and neutral surfaces.
 * Reference: https://m3.material.io/styles
 */

// Colour roles

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
  /** Income. */
  success: string;
  successContainer: string;
  /** Spending ahead of the time elapsed, but not over budget yet. */
  warning: string;
  warningContainer: string;
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
  inversePrimary: string;
  scrim: string;
}

/** A clean blue-on-white palette, the way payment apps look: one accent, quiet surfaces, colour only where it means something. */
export const m3Light: M3Roles = {
  primary: '#0B57D0',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D3E3FD',
  onPrimaryContainer: '#041E49',
  secondaryContainer: '#D3E3FD',
  onSecondaryContainer: '#041E49',
  tertiary: '#5E5E5E',
  error: '#B3261E',
  onError: '#FFFFFF',
  errorContainer: '#F9DEDC',
  onErrorContainer: '#8C1D18',
  success: '#146C2E',
  successContainer: '#C4EED0',
  warning: '#8A5000',
  warningContainer: '#FFEBC8',
  surface: '#FFFFFF',
  surfaceDim: '#E9EEF6',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F8FAFD',
  surfaceContainer: '#F0F4F9',
  surfaceContainerHigh: '#E9EEF6',
  surfaceContainerHighest: '#DDE3EA',
  onSurface: '#1F1F1F',
  onSurfaceVariant: '#444746',
  outline: '#747775',
  outlineVariant: '#C4C7C5',
  inverseSurface: '#303030',
  inverseOnSurface: '#F2F2F2',
  inversePrimary: '#A8C7FA',
  scrim: '#000000',
};

export const m3Dark: M3Roles = {
  primary: '#A8C7FA',
  onPrimary: '#062E6F',
  primaryContainer: '#0842A0',
  onPrimaryContainer: '#D3E3FD',
  secondaryContainer: '#0842A0',
  onSecondaryContainer: '#D3E3FD',
  tertiary: '#C7C7C7',
  error: '#F2B8B5',
  onError: '#601410',
  errorContainer: '#8C1D18',
  onErrorContainer: '#F9DEDC',
  success: '#6DD58C',
  successContainer: '#0F5223',
  warning: '#FFB74D',
  warningContainer: '#4A3410',
  surface: '#131314',
  surfaceDim: '#131314',
  surfaceContainerLowest: '#0E0E0E',
  surfaceContainerLow: '#1B1B1B',
  surfaceContainer: '#1E1F20',
  surfaceContainerHigh: '#282A2C',
  surfaceContainerHighest: '#333537',
  onSurface: '#E3E3E3',
  onSurfaceVariant: '#C4C7C5',
  outline: '#8E918F',
  outlineVariant: '#444746',
  inverseSurface: '#E3E3E3',
  inverseOnSurface: '#303030',
  inversePrimary: '#0B57D0',
  scrim: '#000000',
};

// Type scale (Google Sans)

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

// Shape

export const shape = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 999,
} as const;

/**
 * Component radii: one place to decide how rounded each kind of control is, so fields, keys, cards and sheets
 * stay consistent. (M3: medium for cards and fields, large for keys, extra-large for hero containers and sheets, full for buttons.)
 */
export const radius = {
  field: shape.medium,
  key: shape.large,
  card: shape.medium,
  hero: shape.extraLarge,
  sheet: shape.extraLarge,
  action: shape.full,
} as const;

// State layers and elevation

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

// Motion

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
