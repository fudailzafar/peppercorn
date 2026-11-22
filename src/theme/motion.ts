import { Easing, type EasingFunction } from 'react-native';

/**
 * Motion tokens lifted from Dime's SwiftUI source so the two apps move the same way.
 * SwiftUI springs are described by response (seconds) and dampingFraction; React Native's
 * Animated.spring wants stiffness and damping (mass 1), so we convert.
 */
export function swiftSpring(response: number, dampingFraction: number) {
  const omega = (2 * Math.PI) / response;
  return { stiffness: omega * omega, damping: 2 * dampingFraction * omega, mass: 1 };
}

/**
 * Reanimated spring configs shaped like UIKit's: a smooth settle with a hint of overshoot,
 * and a snappier one for small controls. Built from the same (response, damping) pairs SwiftUI uses.
 */
export const springs = {
  smooth: swiftSpring(0.45, 0.85),
  snappy: swiftSpring(0.32, 0.85),
} as const;

export const motion = {
  /** `.interactiveSpring(response: 0.6, dampingFraction: 0.8)`: used for chart bars growing in. */
  chartSpring: swiftSpring(0.6, 0.8),
  /** Delay between neighbouring bars: `.delay(Double(index) * 0.1)`. */
  barStagger: 100,
  /** `.easeInOut(duration: 0.3)`: page slides and popover dismissals. */
  easeInOut: { duration: 300, easing: Easing.inOut(Easing.ease) as EasingFunction },
  /** `.easeIn(duration: 0.15)`: selection changes in menus. */
  easeInQuick: { duration: 150, easing: Easing.in(Easing.ease) as EasingFunction },
  /** `withAnimation(.easeInOut)`: SwiftUI's default 0.35s, used for sliding panels. */
  slide: { duration: 350, easing: Easing.inOut(Easing.ease) as EasingFunction },
  /** `.easeInOut(duration: 0.2)`: popover presentation. */
  present: { duration: 200, easing: Easing.inOut(Easing.ease) as EasingFunction },
} as const;
