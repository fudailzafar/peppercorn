// Each weight by its own path: the package's index would put all of them, 2 MB each, into the app.
import { GoogleSans_400Regular } from '@expo-google-fonts/google-sans/400Regular';
import { GoogleSans_500Medium } from '@expo-google-fonts/google-sans/500Medium';
import { GoogleSans_700Bold } from '@expo-google-fonts/google-sans/700Bold';
import { useFonts } from 'expo-font';

export type Weight = 'regular' | 'medium' | 'bold';

/** Google Sans, one file for each weight. */
export const FONTS: Record<Weight, string> = {
  regular: 'GoogleSans_400Regular',
  medium: 'GoogleSans_500Medium',
  bold: 'GoogleSans_700Bold',
};

/** True once words can be drawn: in the phone's own font, if these can't be loaded. */
export function useFontsReady(): boolean {
  const [loaded, error] = useFonts({ GoogleSans_400Regular, GoogleSans_500Medium, GoogleSans_700Bold });
  return loaded || error !== null;
}
