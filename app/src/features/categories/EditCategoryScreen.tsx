import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@/lib/haptics';
import { messages, store } from '@/state/app';
import { useData } from '@/state/hooks';
import { shape } from '@/theme/material';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Confirm } from '@/ui/Confirm';
import { Icon } from '@/ui/Icon';
import { Button, EmojiAvatar, OutlinedField, TopAppBar } from '@/ui/material';
import { SlideUp } from '@/ui/SlideUp';
import { Touch } from '@/ui/Touch';
import { useKeyboardLift } from '@/ui/useKeyboardLift';
import { COLOURS, EMOJIS, inkOn, MINT } from './choices';

const LONGEST = 24;

/** A category's name, colour and emoji. */
export function EditCategoryScreen() {
  const params = useLocalSearchParams<{ id?: string; income?: string }>();
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const { onLayout, lift } = useKeyboardLift();
  const data = useData();
  // As it was on opening, so deleting it doesn't turn this into the page for a new one.
  const [old] = useState(() => store.data.categories.find((c) => c.id === params.id && !c.asset));
  const income = old?.income ?? params.income === '1';
  const colours = income ? [MINT, ...COLOURS] : COLOURS;
  const [name, setName] = useState(old?.name ?? '');
  const [emoji, setEmoji] = useState(old?.emoji ?? '😄');
  const [colour, setColour] = useState(old?.colour ?? colours[0][0]);
  const [deleting, setDeleting] = useState(false);
  const done = useRef(false);

  const warn = (text: string) => {
    haptics.no();
    messages.warn(text);
  };

  const save = (close: () => void) => {
    if (done.current) return;
    const called = name.trim();
    if (called === '') return warn('Enter a name');
    const taken = data.categories.some((c) => c.income === income && c.id !== old?.id && c.name.toLowerCase() === called.toLowerCase());
    if (taken) return warn('You already have a category with this name');
    done.current = true;
    if (old) store.updateCategory(old.id, { name: called, emoji, colour });
    else store.addCategory({ name: called, emoji, colour, income });
    haptics.done();
    close();
  };

  return (
    <SlideUp draggable={false}>
      {(close) => (
        <View style={[styles.fill, { paddingBottom: lift }]} onLayout={onLayout}>
          <TopAppBar title={old ? 'Edit category' : 'New category'} onBack={close} close actions={<Button variant="text" label="Save" onPress={() => save(close)} />} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.face}>
              <EmojiAvatar emoji={emoji} colour={colour} size={88} />
            </View>
            <OutlinedField label="Name" accessibilityLabel="Name" value={name} onChangeText={setName} maxLength={LONGEST} autoCapitalize="sentences" returnKeyType="done" />

            <Heading text="Colour" />
            <View style={styles.colours} accessibilityRole="radiogroup">
              {colours.map(([hex, called]) => (
                <Touch key={hex} ink={m3.onSurface} radius={shape.full} label={called} accessibilityRole="radio" accessibilityState={{ checked: hex === colour }} onPress={() => setColour(hex)} style={styles.spot}>
                  <View style={[styles.colour, { backgroundColor: hex }]}>{hex === colour ? <Icon name="checkmark" size={22} color={inkOn(hex)} /> : null}</View>
                </Touch>
              ))}
            </View>

            <Heading text="Emoji" />
            <View style={styles.emojis} accessibilityRole="radiogroup">
              {EMOJIS.map((e) => (
                <Touch
                  key={e}
                  ink={m3.onSurface}
                  radius={shape.full}
                  label={e}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: e === emoji }}
                  onPress={() => setEmoji(e)}
                  style={[styles.spot, e === emoji && { backgroundColor: m3.secondaryContainer }]}
                >
                  <AppText size={24} allowFontScaling={false}>
                    {e}
                  </AppText>
                </Touch>
              ))}
            </View>

            {old ? <Button variant="danger" icon="trash-outline" label="Delete category" onPress={() => setDeleting(true)} style={styles.delete} /> : null}
          </ScrollView>
          {old ? (
            <Confirm
              visible={deleting}
              title={`Delete “${old.name}” category?`}
              message={goneWith(data.entries.filter((e) => e.categoryId === old.id).length, data.budgets.some((b) => b.categoryId === old.id))}
              onCancel={() => setDeleting(false)}
              onConfirm={() => {
                setDeleting(false);
                done.current = true;
                store.removeCategory(old.id);
                haptics.done();
                close();
              }}
            />
          ) : null}
        </View>
      )}
    </SlideUp>
  );
}

/** Names only what really goes with a category. */
function goneWith(entries: number, budget: boolean): string {
  const what = [entries === 1 ? 'its 1 entry' : entries > 1 ? `its ${entries} entries` : '', budget ? 'its budget' : ''].filter(Boolean).join(' and ');
  return `${what ? `This also deletes ${what}. ` : ''}You can’t undo this.`;
}

function Heading({ text }: { text: string }) {
  const { m3 } = useTheme();
  return (
    <AppText variant="titleSmall" color={m3.onSurfaceVariant} accessibilityRole="header" style={styles.heading}>
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 16 },
  face: { alignItems: 'center', paddingTop: 16, paddingBottom: 24 },
  heading: { marginTop: 28, marginBottom: 12 },
  colours: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  // 48 to touch, 40 to see.
  spot: { width: 48, height: 48, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  colour: { width: 40, height: 40, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  delete: { marginTop: 32 },
});
