import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, type LayoutChangeEvent } from 'react-native';

/**
 * How far to lift content so the keyboard doesn't cover it. Put `onLayout` on a full-height view and add `lift` as its
 * bottom padding. Some phones shrink the window for the keyboard themselves; that part is subtracted, so content
 * never moves twice.
 */
export function useKeyboardLift() {
  const [keyboard, setKeyboard] = useState(0);
  const [full, setFull] = useState(0);
  const [now, setNow] = useState(0);
  const tallest = useRef(0);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKeyboard(e.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    tallest.current = Math.max(tallest.current, h);
    setFull(tallest.current);
    setNow(h);
  }, []);

  return { onLayout, lift: keyboard === 0 ? 0 : Math.max(0, keyboard - (full - now)) };
}
