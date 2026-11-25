import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clock24, toDay } from '@/domain/dates';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { BottomSheet, Button } from '@/ui/material';

/** The date, then the time, in Android's own dialogs. */
function askAndroid(value: number, onChange: (ms: number) => void) {
  DateTimePickerAndroid.open({
    value: new Date(value),
    mode: 'date',
    onValueChange: (_, day) => {
      const was = new Date(value);
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), was.getHours(), was.getMinutes());
      onChange(at.getTime());
      DateTimePickerAndroid.open({
        value: at,
        mode: 'time',
        onValueChange: (__, time) => onChange(new Date(at.getFullYear(), at.getMonth(), at.getDate(), time.getHours(), time.getMinutes()).getTime()),
      });
    },
  });
}

/** Asks for a date and time. `sheet` goes at the end of the screen, for where there are no dialogs of the phone's own. */
export function useDateTime(value: number, onChange: (ms: number) => void) {
  const { m3, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const ask = () => (Platform.OS === 'android' ? askAndroid(value, onChange) : setVisible(true));
  const sheet =
    Platform.OS === 'android' ? null : (
      <BottomSheet visible={visible} onClose={() => setVisible(false)} bottomInset={insets.bottom}>
        <AppText variant="titleLarge">Date and time</AppText>
        <View style={styles.picker}>
          {Platform.OS === 'web' ? (
            createElement('input', {
              type: 'datetime-local',
              'aria-label': 'Date and time',
              value: `${toDay(value)}T${clock24(value)}`,
              onChange: (e: { target: { value: string } }) => {
                const ms = new Date(e.target.value).getTime();
                if (Number.isFinite(ms)) onChange(ms);
              },
              style: { font: 'inherit', fontSize: 16, padding: 14, borderRadius: 12, border: `1px solid ${m3.outline}`, color: m3.onSurface, background: 'transparent', colorScheme: dark ? 'dark' : 'light' },
            })
          ) : (
            <DateTimePicker value={new Date(value)} mode="datetime" display="inline" accentColor={m3.primary} themeVariant={dark ? 'dark' : 'light'} onValueChange={(_, date) => onChange(date.getTime())} />
          )}
        </View>
        <Button large label="Done" onPress={() => setVisible(false)} />
      </BottomSheet>
    );
  return { ask, sheet };
}

const styles = StyleSheet.create({ picker: { paddingVertical: 20 } });
