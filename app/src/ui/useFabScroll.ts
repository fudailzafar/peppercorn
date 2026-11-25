import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useFab } from './useFab';

/** Scrolling calls this many times a second: only a change is worth telling. */
function tuck(tucked: boolean) {
  if (useFab.getState().tucked !== tucked) useFab.setState({ tucked });
}

/**
 * Hide-on-scroll for the floating add button (the Material pattern): scrolling down tucks it away so it never
 * covers a row's amount, scrolling up or reaching the top brings it back. Spread the result onto a ScrollView.
 */
export function useFabScroll() {
  const last = useRef(0);

  // Always start a screen with the button showing.
  useFocusEffect(
    useCallback(() => {
      last.current = 0;
      tuck(false);
    }, []),
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const y = contentOffset.y;
      const dy = y - last.current;
      const atEnd = y + layoutMeasurement.height >= contentSize.height - 4;
      if (y <= 0 || atEnd) tuck(false);
      else if (dy > 6) tuck(true);
      else if (dy < -6) tuck(false);
      last.current = y;
    },
    [],
  );

  return { onScroll, scrollEventThrottle: 16 } as const;
}
