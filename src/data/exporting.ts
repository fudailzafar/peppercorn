import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

/** Makes a file for a spreadsheet and opens the phone's own list of where to send it. False if there is nowhere. Throws if it can't be made. */
export async function shareCsv(name: string, text: string): Promise<boolean> {
  if (!(await isAvailableAsync())) return false;
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(text);
  await shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Export data' });
  return true;
}
