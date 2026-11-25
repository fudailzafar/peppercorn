import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, Pressable, StyleSheet, View, type TextInput } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { CategoryButton, CategoryChips, CategoryGrid, type CategoryButtonHandle } from '../components/CategoryPicker';
import { repeatLabel } from '../components/labels';
import { AssistChip, Button, IconButton, PillField, SegmentedButton } from '../components/material';
import { NumberPad, TypedAmount } from '../components/NumberPad';
import { RepeatMenu } from '../components/RepeatMenu';
import { SlideUp } from '../components/SlideUp';
import { messages, prices, store } from '../data/app';
import { useData, useNow } from '../data/hooks';
import { ASSETS, assetOf } from '../domain/assets';
import { clock24, dayAndMonth, toDay, weekdayLabel } from '../domain/dates';
import { buying, draftOf, finished, needsPrice, newDraft, priceHint, problemWith, withCategory, withPast, withSuggestion, type DraftProblem, type EntryDraft } from '../domain/draft';
import { categoryOf, choices, noteSuggestions } from '../domain/entries';
import type { Key } from '../domain/keypad';
import { haptics } from '../hooks/haptics';
import { useDateTime } from '../hooks/useDateTime';
import { useKeyboardLift } from '../hooks/useKeyboardLift';
import { m3Duration } from '../theme/material';
import { useTheme } from '../theme/theme';

const SAID: Record<DraftProblem, string> = {
  amountAndCategory: 'Enter an amount and choose a category',
  amount: 'Enter an amount',
  grams: 'Enter the grams',
  category: 'Choose a category',
  price: 'Couldn’t get the price. Check your connection and try again.',
};

/** Add or change an entry. */
export default function EntryPage() {
  const params = useLocalSearchParams<{ id?: string; income?: string; asset?: string }>();
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useData();
  const today = toDay(useNow());
  const { onLayout, lift } = useKeyboardLift();
  // As it was on opening, so deleting it doesn't turn this into the page for a new one while it slides away.
  const [old] = useState(() => store.data.entries.find((e) => e.id === params.id));
  const [draft, setDraft] = useState<EntryDraft>(() => {
    const asset = ASSETS.find((a) => a.id === params.asset)?.id;
    return old ? draftOf(store.data, old) : newDraft(store.data, Date.now(), params.income === '1', asset);
  });
  const [picking, setPicking] = useState(false);
  const [typingNote, setTypingNote] = useState(false);
  const noteField = useRef<ComponentRef<typeof TextInput>>(null);
  const categoryButton = useRef<CategoryButtonHandle>(null);
  // Saved or deleted: a second tap while the page slides away does nothing.
  const done = useRef(false);

  const change = (more: Partial<EntryDraft>) => setDraft((d) => ({ ...d, ...more }));
  const type = (key: Key) => setDraft((d) => ({ ...d, pad: key(d.pad) }));
  const pick = (id: string | null) => {
    setDraft((d) => withCategory(store.data, d, id));
    setPicking(false);
  };
  const { ask: askDate, sheet: dateSheet } = useDateTime(draft.date, (date) => change({ date }));

  // Closing the keyboard also leaves the note, so the number pad returns.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => noteField.current?.blur());
    return () => sub.remove();
  }, []);

  const unpriced = needsPrice(data, draft);
  useEffect(() => {
    if (unpriced) void prices.refresh(true);
  }, [unpriced, draft.categoryId]);

  const save = (close: () => void) => {
    if (done.current) return;
    const problem = problemWith(data, draft, old);
    if (problem) {
      haptics.no();
      messages.warn(SAID[problem]);
      if (problem === 'amountAndCategory' || problem === 'category') categoryButton.current?.missing();
      if (problem === 'price') void prices.refresh(true);
      return;
    }
    done.current = true;
    const entry = finished(data, draft, today, old);
    if (old) {
      const was = store.data.entries.find((e) => e.id === old.id);
      const past = store.update(old.id, entry);
      messages.show(withPast('Changes saved', past.length), past.length > 0 && was ? { undo: () => store.undo(past, was) } : {});
    } else {
      const added = store.add(entry);
      const what = 'asset' in entry && entry.asset ? `${assetOf(entry.asset).name} saved` : entry.income ? 'Income saved' : 'Expense saved';
      messages.show(withPast(what, added.length - 1), { undo: () => store.undo(added) });
    }
    haptics.done();
    // An older day's price, if this purchase needs one.
    if ('asset' in entry && entry.rate === undefined) void prices.refresh(true);
    close();
  };

  const remove = (close: () => void) => {
    if (done.current || !old) return;
    done.current = true;
    const gone = store.remove(old.id);
    if (gone) messages.show('Entry deleted', { undo: () => store.putBack(gone) });
    haptics.done();
    close();
  };

  const category = categoryOf(data, draft.categoryId);
  const options = choices(data, draft.income);
  const { metal, amount } = buying(data, draft, old);
  const hint = priceHint(data, draft, today, old);
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
                    setDraft((d) => ({ ...withCategory(store.data, d, null), income: i === 1 }));
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
            {hint ? (
              <AppText variant="bodyMedium" color={m3.onSurfaceVariant} accessibilityLiveRegion="polite" style={styles.hint}>
                {hint}
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
              ? noteSuggestions(data, draft.note, draft.income).map((like) => (
                  <AssistChip
                    key={like.id}
                    label={like.note}
                    onPress={() => {
                      setDraft((d) => withSuggestion(store.data, d, like));
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
            <Animated.View entering={FadeIn.duration(m3Duration.short4)}>
              <CategoryGrid options={options} selected={draft.categoryId} onPick={pick} />
            </Animated.View>
          ) : typingNote ? null : (
            <Animated.View entering={FadeIn.duration(m3Duration.short4)}>
              <NumberPad pad={draft.pad} onKey={type} onSubmit={() => save(close)} submitLabel="Save entry" />
            </Animated.View>
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
