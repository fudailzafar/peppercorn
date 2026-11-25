import { ImpactFeedbackStyle, NotificationFeedbackType, impactAsync, notificationAsync, selectionAsync } from 'expo-haptics';
import { Platform } from 'react-native';
import { store } from '../data/app';

/** Feels something, if the phone can and the person wants it to. */
function feel(what: (strong: boolean) => Promise<void>) {
  const level = store.data.settings.haptics;
  if (level !== 'off' && Platform.OS !== 'web') what(level === 'strong').catch(() => undefined);
}

export const haptics = {
  /** A key, or a drag that reached its point. */
  tap: () => feel((strong) => impactAsync(strong ? ImpactFeedbackStyle.Medium : ImpactFeedbackStyle.Light)),
  /** One of several chosen. */
  select: () => feel(() => selectionAsync()),
  /** Saved, or deleted as asked. */
  done: () => feel(() => notificationAsync(NotificationFeedbackType.Success)),
  /** That can't be done. */
  no: () => feel(() => notificationAsync(NotificationFeedbackType.Warning)),
};
