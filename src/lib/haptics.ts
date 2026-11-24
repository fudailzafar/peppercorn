import * as ExpoHaptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useStore } from './store';

// Respects the Haptics setting: 0 = off, 1 = subtle, 2 = heavy.
const run = (fn: (heavy: boolean) => Promise<void>) => {
  const level = useStore.getState().settings.haptics;
  if (level === 0 || Platform.OS === 'web') return;
  fn(level === 2).catch(() => {});
};

export const Haptics = {
  light: () =>
    run((heavy) =>
      ExpoHaptics.impactAsync(heavy ? ExpoHaptics.ImpactFeedbackStyle.Medium : ExpoHaptics.ImpactFeedbackStyle.Light),
    ),
  medium: () => run(() => ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium)),
  selection: () => run(() => ExpoHaptics.selectionAsync()),
  success: () => run(() => ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success)),
  error: () => run(() => ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error)),
  warning: () => run(() => ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning)),
};
