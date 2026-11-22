import { goBack } from '../lib/nav';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Icon } from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Chip, IconButton, OutlinedField } from '../components/m3';
import { ConfirmSheet } from '../components/Overlays';
import { EMOJIS } from '../lib/emojis';
import { Haptics } from '../lib/haptics';
import { useStore, useUi } from '../lib/store';
import { categoryColors } from '../theme/tokens';
import { shape, typeScale } from '../theme/material';
import { useTheme, withAlpha } from '../theme/theme';

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
    <View style={{ flex: 1, backgroundColor: m3.surface, paddingTop: insets.top }}>
      {/* M3 full-screen dialog app bar: close, title, and a text "Save" action */}
      <View style={styles.top}>
        <IconButton icon="close" onPress={() => goBack()} label="Close" tint={m3.onSurface} />
        <AppText size={typeScale.titleLarge.size} color={m3.onSurface} style={{ marginLeft: 8, flex: 1 }}>
          {existing ? 'Edit category' : 'New category'}
        </AppText>
        <Chip label="Save" onPress={save} tint={m3.primary} onTint={m3.onPrimary} accessibilityLabel="Save" style={{ marginRight: 12 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 24 }}>
          <View style={[styles.preview, { backgroundColor: withAlpha(colour, 0.3) }]}>
            <AppText size={44} style={{ includeFontPadding: false }}>
              {emoji}
            </AppText>
          </View>
        </View>

        <OutlinedField label="Name" value={name} onChangeText={setName} maxLength={24} width={width - 32} />

        <AppText size={typeScale.labelLarge.size} weight="semibold" color={m3.onSurfaceVariant} style={styles.section}>
          Colour
        </AppText>
        <View style={styles.grid}>
          {palette.map((col) => (
            <Pressable key={col} onPress={() => setColour(col)} style={[styles.swatch, { backgroundColor: col }]} accessibilityRole="radio" accessibilityState={{ selected: colour === col }} accessibilityLabel={`Colour ${col}`}>
              {colour === col ? <Icon name="checkmark" size={22} color="#FFFFFF" /> : null}
            </Pressable>
          ))}
        </View>

        <AppText size={typeScale.labelLarge.size} weight="semibold" color={m3.onSurfaceVariant} style={styles.section}>
          Emoji
        </AppText>
        <View style={styles.grid}>
          {EMOJIS.map((e) => (
            <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, emoji === e && { backgroundColor: m3.secondaryContainer }]}>
              <AppText size={26}>{e}</AppText>
            </Pressable>
          ))}
        </View>

        {existing ? (
          <View style={{ marginTop: 32, alignItems: 'flex-start' }}>
            <Chip icon="trash-outline" label="Delete category" onPress={() => setConfirmDelete(true)} tint={m3.errorContainer} onTint={m3.onErrorContainer} />
          </View>
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
  top: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  preview: { width: 88, height: 88, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 28, marginBottom: 12, letterSpacing: 0.1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 44, height: 44, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  emoji: { width: 48, height: 48, borderRadius: shape.medium, alignItems: 'center', justifyContent: 'center' },
});
