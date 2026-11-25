import { Easing } from 'react-native-reanimated';
import { m3Easing } from './material';

/* Material's easing curves and one spring, for Reanimated. https://m3.material.io/styles/motion */

export const standardEasing = Easing.bezier(...m3Easing.emphasized);
export const arriving = Easing.bezier(...m3Easing.emphasizedDecelerate);
export const leaving = Easing.bezier(...m3Easing.emphasizedAccelerate);

/** Back to rest after a drag that was let go early. Material's default spatial spring. */
export const settle = { mass: 1, stiffness: 700, damping: 48 } as const;
