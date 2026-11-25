import type { Typing } from './model';
import { groupDigits, money } from './money';

/**
 * What has been typed on the number pad. Typing with a point, the text is the number ("12.5"); filling in cents first,
 * it is a count of cents ("1250").
 */
export interface Keypad {
  text: string;
  typing: Typing;
  decimals: number;
}

const MAX_WHOLE = 9;

export const emptyPad = (typing: Typing = 'point', decimals = 2): Keypad => ({ text: '', typing, decimals });

/** The keypad as it would be after typing `n`. */
export function padOf(n: number, typing: Typing, decimals = 2): Keypad {
  const scale = 10 ** decimals;
  const text = typing === 'cents' ? String(Math.round(n * 100)) : String(Math.round(n * scale) / scale);
  return { text: text === '0' ? '' : text, typing, decimals };
}

export function padValue(pad: Keypad): number {
  if (pad.text === '' || pad.text === '.') return 0;
  return pad.typing === 'cents' ? Number(pad.text) / 100 : Number(pad.text);
}

/** A key, as what it does to whatever is typed: two quick taps must not both start from the same number. */
export type Key = (pad: Keypad) => Keypad;

export const digitKey =
  (d: number): Key =>
  (pad) => {
    if (pad.typing === 'cents') {
      const text = (pad.text + d).replace(/^0+/, '');
      return text.length > MAX_WHOLE ? pad : { ...pad, text };
    }
    const point = pad.text.indexOf('.');
    if (point >= 0) return pad.text.length - point - 1 >= pad.decimals ? pad : { ...pad, text: pad.text + d };
    const text = pad.text === '0' ? String(d) : pad.text + d;
    return text.length > MAX_WHOLE ? pad : { ...pad, text };
  };

export const pointKey: Key = (pad) => (pad.typing === 'cents' || pad.text.includes('.') ? pad : { ...pad, text: `${pad.text || '0'}.` });

export const backKey: Key = (pad) => ({ ...pad, text: pad.text.slice(0, -1) });

/** What the big amount shows while typing. */
export function padShown(pad: Keypad, code: string): string {
  if (pad.typing === 'cents') return money(code, true).full(padValue(pad)).slice(money(code, true).symbol.length);
  if (pad.text === '') return '0';
  const [whole, cents] = pad.text.split('.');
  return groupDigits(whole || '0', code) + (cents === undefined ? '' : `.${cents}`);
}
