import { router } from 'expo-router';

/** Back, or Home when there is nothing behind (a page opened by its address). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

// Two quick taps must not open a page twice.
let opened = 0;

/** Opens a page. */
export function openPage(href: Parameters<typeof router.push>[0]) {
  const now = Date.now();
  if (now - opened < 400) return;
  opened = now;
  router.push(href);
}
