import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { createElement, useCallback, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';
import { BottomSheet, FilledButton } from './m3';

const pad = (n: number) => String(n).padStart(2, '0');
const toInputValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Date and time selection using the system pickers: a date dialog then a time dialog on
 * Android, an inline picker sheet on iOS, and a native input on web.
 */
export function useDateTimePicker(value: Date, onChange: (d: Date) => void): { open: () => void; element: ReactNode } {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(value);

  const open = useCallback(() => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        onValueChange: (_e, picked) =>
          DateTimePickerAndroid.open({
            value: picked,
            mode: 'time',
            onValueChange: (_e2, final) => onChange(final),
          }),
      });
      return;
    }
    setDraft(value);
    setVisible(true);
  }, [value, onChange]);

  const element = (
    <BottomSheet visible={visible} onClose={() => setVisible(false)} bottomInset={insets.bottom}>
      {Platform.OS === 'ios' ? (
        <DateTimePicker value={draft} mode="datetime" display="inline" onValueChange={(_e, d) => setDraft(d)} />
      ) : (
        createElement('input', {
          type: 'datetime-local',
          value: toInputValue(draft),
          onChange: (e: { target: { value: string } }) => {
            const next = new Date(e.target.value);
            if (!Number.isNaN(next.getTime())) setDraft(next);
          },
          style: { fontSize: 18, padding: 14, borderRadius: 4, border: `1px solid ${m3.outline}`, marginBottom: 8, background: m3.surfaceContainerLow, color: m3.onSurface, fontFamily: 'GoogleSans_400Regular' },
        })
      )}
      <FilledButton
        label="Done"
        onPress={() => {
          onChange(draft);
          setVisible(false);
        }}
      />
    </BottomSheet>
  );

  return { open, element };
}
