import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../data/hooks';

const DURATION = 500;
const slowing = (t: number) => 1 - (1 - t) ** 3;

/** A part of a whole (0 to 1) that grows from nothing at first, and moves to each new value, if charts are to move. */
export function useGrowing(target: number): number {
  const { animated } = useSettings();
  const goal = Math.min(Math.max(target, 0), 1);
  const [shown, setShown] = useState(animated ? 0 : goal);
  const at = useRef(shown);
  useEffect(() => {
    if (!animated) return;
    const from = at.current;
    let frame = 0;
    let began = 0;
    const step = (now: number) => {
      began ||= now;
      const t = Math.min(1, (now - began) / DURATION);
      at.current = from + (goal - from) * slowing(t);
      setShown(at.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [goal, animated]);
  return animated ? shown : goal;
}
