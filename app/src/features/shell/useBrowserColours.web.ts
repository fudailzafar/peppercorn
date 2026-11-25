import { useEffect } from 'react';
import type { Theme } from '@/theme/theme';

/** What is around the app in a browser has its colours too. */
export function useBrowserColours({ m3, dark }: Theme) {
  const colour = m3.surface;
  useEffect(() => {
    const page = document.documentElement;
    page.style.colorScheme = dark ? 'dark' : 'light';
    page.style.backgroundColor = colour;
    document.body.style.backgroundColor = colour;
    for (const tag of document.querySelectorAll('meta[name="theme-color"]')) tag.setAttribute('content', colour);
  }, [colour, dark]);
}
