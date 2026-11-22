import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { createElement, useCallback, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

const pad = (n: number) => String(n).padStart(2, '0');
const toInputValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Date and time selection using the system pickers: a date dialog then a time dialog on
 * Android, an inline picker sheet on iOS, and a native input on web.
 */
export function useDateTimePicker(value: Date, onChange: (d: Date) => void): { open: () => void; element: ReactNode } {
  const { c } = useTheme();
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)} statusBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} onPress={() => setVisible(false)} />
      <View style={styles.wrap} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: c.PrimaryBackground, paddingBottom: Math.max(insets.bottom, 16) }]}>
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
              style: { fontSize: 20, padding: 12, borderRadius: 12, border: `1px solid ${c.Outline}`, margin: 16, background: c.PrimaryBackground, color: c.PrimaryText },
            })
          )}
          <Pressable
            onPress={() => {
              onChange(draft);
              setVisible(false);
            }}
            style={[styles.done, { backgroundColor: c.DarkBackground }]}
          >
            <AppText size={19} weight="semibold" color="LightIcon">
              Done
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  return { open, element };
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 12, paddingHorizontal: 16 },
  done: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
