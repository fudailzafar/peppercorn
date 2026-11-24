/**
 * Material 3 motion, ready to use with Reanimated and Animated.
 * Easing and duration tokens live in material.ts; this file holds the M3 Expressive spring tokens.
 * Reference: https://m3.material.io/styles/motion/overview/specs
 */

/** A spring from M3's (stiffness, damping ratio) pair, as the mass-1 config Reanimated expects. */
function spring(stiffness: number, dampingRatio: number) {
  return { stiffness, damping: 2 * dampingRatio * Math.sqrt(stiffness), mass: 1 };
}

export const springs = {
  /** Spatial springs move things across the screen (position, size, shape). */
  smooth: spring(700, 0.9), // default spatial
  snappy: spring(1400, 0.9), // fast spatial
  slow: spring(300, 0.9), // slow spatial
  /** Effects springs change colour or opacity and never overshoot. */
  effects: spring(1600, 1),
} as const;

export const motion = {
  /** Delay between neighbouring bars when a chart grows in. */
  barStagger: 30,
} as const;
