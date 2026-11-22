import { router } from 'expo-router';

/** Go back, or fall back to the Log tab when opened directly (deep link / web reload). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
