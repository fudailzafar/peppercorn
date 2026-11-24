import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useUi } from './store';

/**
 * Hide-on-scroll for the floating add button (the Material pattern): scrolling down tucks it away so it never
 * covers a row's amount, scrolling up or reaching the top brings it back. Spread the result onto a ScrollView.
 */
export function useFabScroll() {
  const last = useRef(0);
  const setFabHidden = useUi((s) => s.setFabHidden);

  // Always start a screen with the button showing.
  useFocusEffect(
    useCallback(() => {
      last.current = 0;
      setFabHidden(false);
    }, [setFabHidden]),
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const y = contentOffset.y;
      const dy = y - last.current;
      const atEnd = y + layoutMeasurement.height >= contentSize.height - 4;
      if (y <= 0 || atEnd) setFabHidden(false);
      else if (dy > 6) setFabHidden(true);
      else if (dy < -6) setFabHidden(false);
      last.current = y;
    },
    [setFabHidden],
  );

  return { onScroll, scrollEventThrottle: 16 } as const;
}
