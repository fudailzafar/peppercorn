import { goBack } from '../lib/nav';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Icon } from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button, EmojiAvatar, OutlinedField, TopAppBar } from '../components/material';
import { ConfirmSheet } from '../components/Overlays';
import { EMOJIS } from '../lib/emojis';
import { Haptics } from '../lib/haptics';
import { useStore, useUi } from '../lib/store';
import { categoryColors, colourNames } from '../theme/tokens';
import { shape } from '../theme/material';
import { useTheme } from '../theme/theme';

const INCOME_COLOUR = '#76FBB1';

/** Black or white, whichever reads better on a swatch. */
function onColour(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150 ? '#000000' : '#FFFFFF';
}

/** Create or edit a category: emoji, name and colour. */
export default function CategoryEdit() {
  const { id, income: incomeParam } = useLocalSearchParams<{ id?: string; income?: string }>();
  const { m3 } = useTheme();
  const { width } = useWindowDimensions();
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
  const [colour, setColour] = useState(existing?.colour ?? (income ? INCOME_COLOUR : categoryColors[0]));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const palette = income ? [INCOME_COLOUR, ...categoryColors.filter((x) => x !== INCOME_COLOUR)] : categoryColors;
  const txCount = useStore((s) => s.transactions.filter((t) => t.categoryId === id).length);
  const hasBudget = useStore((s) => s.budgets.some((b) => b.categoryId === id));
  // Name only what really goes with the category.
  const alsoDeletes = [txCount > 0 ? (txCount === 1 ? 'its 1 entry' : `its ${txCount} entries`) : '', hasBudget ? 'its budget' : ''].filter(Boolean).join(' and ');

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
      showToast({ title: 'You already have a category with this name', subtitle: 'Try a different name', icon: 'alert-circle', tone: 'info' }, 2200);
      return;
    }
    if (existing) updateCategory(existing.id, { name: trimmed, emoji, colour });
    else addCategory({ name: trimmed, emoji, colour, income });
    Haptics.success();
    goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: m3.surface }}>
      <TopAppBar title={existing ? 'Edit category' : 'New category'} close onBack={() => goBack()} actions={<Button variant="text" label="Save" onPress={save} />} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 24 }}>
          <EmojiAvatar emoji={emoji} colour={colour} size={88} />
        </View>

        <OutlinedField label="Name" value={name} onChangeText={setName} maxLength={24} width={width - 32} />

        <AppText variant="titleSmall" color={m3.onSurfaceVariant} style={styles.section}>
          Colour
        </AppText>
        <View style={styles.grid}>
          {palette.map((col) => (
            <Pressable key={col} onPress={() => setColour(col)} style={[styles.swatch, { backgroundColor: col }]} accessibilityRole="radio" accessibilityState={{ selected: colour === col }} accessibilityLabel={colourNames[col] ?? 'Custom colour'}>
              {colour === col ? <Icon name="checkmark" size={22} color={onColour(col)} /> : null}
            </Pressable>
          ))}
        </View>

        <AppText variant="titleSmall" color={m3.onSurfaceVariant} style={styles.section}>
          Emoji
        </AppText>
        <View style={styles.grid}>
          {EMOJIS.map((e) => (
            <Pressable key={e} onPress={() => setEmoji(e)} accessibilityRole="radio" accessibilityState={{ selected: emoji === e }} accessibilityLabel={e} android_ripple={{ color: `${m3.onSurface}1F`, borderless: true, radius: 24 }} style={[styles.emoji, emoji === e && { backgroundColor: m3.secondaryContainer }]}>
              <AppText size={24}>{e}</AppText>
            </Pressable>
          ))}
        </View>

        {existing ? (
          <View style={{ marginTop: 32, alignItems: 'flex-start' }}>
            <Button variant="danger" icon="trash-outline" label="Delete category" onPress={() => setConfirmDelete(true)} />
          </View>
        ) : null}
      </ScrollView>

      <ConfirmSheet
        visible={confirmDelete}
        title={`Delete “${existing?.name ?? ''}” category?`}
        message={`${alsoDeletes ? `This also deletes ${alsoDeletes}. ` : ''}You can’t undo this.`}
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
  section: { marginTop: 28, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 40, height: 40, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  emoji: { width: 48, height: 48, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
});
