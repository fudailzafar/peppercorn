import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clock24, dayAndMonth, toDay, weekdayLabel } from '@/domain/dates';
import { categoryOf } from '@/domain/entries';
import { haptics } from '@/lib/haptics';
import { repeatLabel } from '@/lib/labels';
import { useData } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { AssistChip, Button, IconButton, PillField, SegmentedButton } from '@/ui/material';
import { NumberPad } from '@/ui/NumberPad';
import { SlideUp } from '@/ui/SlideUp';
import { TypedAmount } from '@/ui/TypedAmount';
import { useKeyboardLift } from '@/ui/useKeyboardLift';
import { CategoryButton, type CategoryButtonHandle } from './CategoryButton';
import { CategoryChips, CategoryGrid } from './CategoryPicker';
import { RepeatMenu } from './RepeatMenu';
import { useDateTime } from './useDateTime';
import { useEntryForm, type EntryParams } from './useEntryForm';

/** Add or change an entry. */
export function EntryScreen() {
  const params = useLocalSearchParams<EntryParams & Record<string, string>>();
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useData();
  const { onLayout, lift } = useKeyboardLift();
  const form = useEntryForm(params);
  const { old, draft, today, options, change, type } = form;
  const [picking, setPicking] = useState(false);
  const [typingNote, setTypingNote] = useState(false);
  const noteField = useRef<ComponentRef<typeof TextInput>>(null);
  const categoryButton = useRef<CategoryButtonHandle>(null);
  const pick = (id: string | null) => {
    form.pick(id);
    setPicking(false);
  };
  const { ask: askDate, sheet: dateSheet } = useDateTime(draft.date, (date) => change({ date }));

  // Closing the keyboard also leaves the note, so the number pad returns.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => noteField.current?.blur());
    return () => sub.remove();
  }, []);

  const save = (close: () => void) => {
    const problem = form.save();
    if (problem === 'amountAndCategory' || problem === 'category') categoryButton.current?.missing();
    if (problem === null) close();
  };
  const remove = (close: () => void) => {
    if (form.remove()) close();
  };

  const category = categoryOf(data, draft.categoryId);
  const { metal, amount } = form.buying;
  const day = toDay(draft.date);
  const when = day === today ? `Today, ${dayAndMonth(day)}` : weekdayLabel(day, today);

  const onBack = () => {
    if (picking) setPicking(false);
    return picking;
  };

  return (
    <SlideUp draggable={!picking && !typingNote} onBack={onBack}>
      {(close) => (
        <View onLayout={onLayout} style={[styles.fill, { paddingTop: insets.top, paddingBottom: lift > 0 ? lift : Math.max(insets.bottom, 12) + 12 }]}>
          <View style={styles.bar}>
            <IconButton icon="close" label="Close" onPress={close} />
            <View style={styles.kind}>
              {data.settings.income ? (
                <SegmentedButton
                  options={['Expense', 'Income']}
                  index={draft.income ? 1 : 0}
                  onChange={(i) => {
                    haptics.select();
                    form.setIncome(i === 1);
                  }}
                />
              ) : null}
            </View>
            {old ? (
              <IconButton icon="trash-outline" label="Delete entry" onPress={() => remove(close)} />
            ) : (
              <RepeatMenu often={draft.often} onChange={(often) => change({ often })}>
                {(open) => <IconButton icon="repeat" label={`Repeat: ${repeatLabel(draft.often)}`} tint={draft.often ? m3.primary : undefined} onPress={open} />}
              </RepeatMenu>
            )}
          </View>

          <Pressable style={styles.middle} onPress={Keyboard.dismiss} accessible={false}>
            <TypedAmount pad={draft.pad} onKey={type} income={draft.income && amount > 0} unit={metal ? 'g' : undefined} />
            {form.hint ? (
              <AppText variant="bodyMedium" color={m3.onSurfaceVariant} accessibilityLiveRegion="polite" style={styles.hint}>
                {form.hint}
              </AppText>
            ) : null}
            <View style={styles.note}>
              <PillField
                inputRef={noteField}
                icon="create-outline"
                placeholder="Add a note"
                accessibilityLabel="Note"
                value={draft.note}
                onChangeText={(note) => change({ note })}
                onFocus={() => {
                  setTypingNote(true);
                  setPicking(false);
                }}
                onBlur={() => setTypingNote(false)}
                maxLength={120}
                returnKeyType="done"
              />
            </View>
            {draft.often || old ? (
              <RepeatMenu often={draft.often} onChange={(often) => change({ often })}>
                {(open) => <AssistChip icon="repeat" label={repeatLabel(draft.often)} onPress={open} />}
              </RepeatMenu>
            ) : null}
            {typingNote
              ? form.suggestions.map((like) => (
                  <AssistChip
                    key={like.id}
                    label={like.note}
                    onPress={() => {
                      form.suggest(like);
                      noteField.current?.blur();
                    }}
                  />
                ))
              : null}
          </Pressable>

          {picking || typingNote || options.length === 0 ? null : <CategoryChips options={options} selected={draft.categoryId} onPick={pick} />}
          <View style={styles.pills}>
            <Button
              variant="outlined"
              icon="calendar"
              label={`${when}  ${clock24(draft.date)}`}
              accessibilityLabel={`${when}, ${clock24(draft.date)}. Change date and time`}
              onPress={() => {
                Keyboard.dismiss();
                askDate();
              }}
              style={styles.fill}
            />
            <CategoryButton
              ref={categoryButton}
              category={category}
              open={picking}
              onPress={() => {
                noteField.current?.blur();
                setPicking(!picking);
              }}
            />
          </View>

          {picking ? (
            <CategoryGrid options={options} selected={draft.categoryId} onPick={pick} />
          ) : typingNote ? null : (
            <NumberPad pad={draft.pad} onKey={type} onSubmit={() => save(close)} submitLabel="Save entry" />
          )}
          {dateSheet}
        </View>
      )}
    </SlideUp>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  kind: { flex: 1, alignItems: 'center' },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  hint: { textAlign: 'center', paddingHorizontal: 16 },
  note: { alignSelf: 'stretch', paddingHorizontal: 16, marginTop: 16 },
  pills: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
});
