import { goBack } from '../lib/nav';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { CircleButton, EmojiTile } from '../components/Bits';
import { ConfirmSheet } from '../components/Overlays';
import { EMOJIS } from '../lib/emojis';
import { Haptics } from '../lib/haptics';
import { useStore, useUi } from '../lib/store';
import { categoryColors } from '../theme/tokens';
import { fontFamily, useTheme } from '../theme/theme';

/** Create or edit a category: emoji, name and colour. */
export default function CategoryEdit() {
  const { id, income: incomeParam } = useLocalSearchParams<{ id?: string; income?: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const categories = useStore((s) => s.categories);
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const showToast = useUi((s) => s.showToast);

  const existing = categories.find((x) => x.id === id);
  const income = existing?.income ?? incomeParam === '1';

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '😄');
  const [colour, setColour] = useState(existing?.colour ?? (income ? '#76FBB1' : categoryColors[0]));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const palette = income ? ['#76FBB1', ...categoryColors.filter((x) => x !== '#76FBB1')] : categoryColors;
  const txCount = useStore((s) => s.transactions.filter((t) => t.categoryId === id).length);

  const save = () => {
    const trimmed = name.trim();
    if (trimmed === '') {
      Haptics.warning();
      showToast({ title: 'Enter a name', icon: 'alert-circle', tone: 'info' }, 1800);
      return;
    }
    const clash = categories.some((x) => x.income === income && x.id !== id && x.name.toLowerCase() === trimmed.toLowerCase());
    if (clash) {
      Haptics.warning();
      showToast({ title: 'Name already used', subtitle: 'Choose a different name', icon: 'alert-circle', tone: 'info' }, 2200);
      return;
    }
    if (existing) updateCategory(existing.id, { name: trimmed, emoji, colour });
    else addCategory({ name: trimmed, emoji, colour, income });
    Haptics.success();
    goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.PrimaryBackground, paddingTop: 16 }}>
      <View style={styles.top}>
        <CircleButton onPress={() => goBack()} label="Close" size={42}>
          <Ionicons name="close" size={22} color={c.SubtitleText} />
        </CircleButton>
        <AppText size={22} weight="semibold">
          {existing ? 'Edit Category' : 'New Category'}
        </AppText>
        <Pressable onPress={save} style={[styles.save, { backgroundColor: c.DarkBackground }]} accessibilityLabel="Save">
          <AppText size={17} weight="semibold" color="LightIcon">
            Save
          </AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 20 }}>
          <EmojiTile emoji={emoji} colour={colour} size={88} />
        </View>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Category name"
          placeholderTextColor={c.SubtitleText}
          maxLength={24}
          style={[styles.input, { backgroundColor: c.SecondaryBackground, color: c.PrimaryText, fontFamily: fontFamily.medium }]}
        />

        <AppText size={17} weight="semibold" color="SubtitleText" style={{ marginTop: 22, marginBottom: 10 }}>
          COLOUR
        </AppText>
        <View style={styles.grid}>
          {palette.map((col) => (
            <Pressable key={col} onPress={() => setColour(col)} style={[styles.swatch, { backgroundColor: col }, colour === col && { borderWidth: 3, borderColor: c.PrimaryText }]} accessibilityLabel={`Colour ${col}`} />
          ))}
        </View>

        <AppText size={17} weight="semibold" color="SubtitleText" style={{ marginTop: 22, marginBottom: 10 }}>
          EMOJI
        </AppText>
        <View style={styles.grid}>
          {EMOJIS.map((e) => (
            <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, emoji === e && { backgroundColor: c.SecondaryBackground, borderWidth: 2, borderColor: c.GreyIcon }]}>
              <AppText size={28}>{e}</AppText>
            </Pressable>
          ))}
        </View>

        {existing ? (
          <Pressable onPress={() => setConfirmDelete(true)} style={[styles.delete, { backgroundColor: c.Alert }]}>
            <AppText size={19} weight="semibold" color="AlertRed">
              Delete Category
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>

      <ConfirmSheet
        visible={confirmDelete}
        title={`Delete '${existing?.name ?? ''}'?`}
        message={txCount > 0 ? `Its ${txCount} ${txCount === 1 ? 'log' : 'logs'} and budget will be deleted too.` : 'This action cannot be undone.'}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (existing) deleteCategory(existing.id);
          setConfirmDelete(false);
          Haptics.success();
          goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  save: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100 },
  input: { fontSize: 24, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 44, height: 44, borderRadius: 14 },
  emoji: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  delete: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
});
