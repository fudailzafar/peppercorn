import { useCallback } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { shortName } from '@/domain/entries';
import type { Category } from '@/domain/model';
import { haptics } from '@/lib/haptics';
import { openPage } from '@/lib/navigation';
import { useTheme } from '@/theme/theme';
import { AppText } from '@/ui/AppText';
import { Button, ChoiceCard, EmojiAvatar, FilterChip } from '@/ui/material';
import { PAD_HEIGHT } from '@/ui/NumberPad';

interface Choices {
  options: readonly Category[];
  selected: string | null;
  onPick: (id: string | null) => void;
}

/** One line of categories, to tap. */
export function CategoryChips({ options, selected, onPick }: Choices) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.chips} contentContainerStyle={styles.chipRow}>
      {options.map((c) => (
        <FilterChip
          key={c.id}
          emoji={c.emoji}
          label={shortName(c)}
          accessibilityLabel={`${c.name} category`}
          selected={c.id === selected}
          onPress={() => {
            haptics.select();
            onPick(c.id === selected ? null : c.id);
          }}
        />
      ))}
    </ScrollView>
  );
}

const keyOf = (c: Category) => c.id;

/** Every category in two columns, where the keypad was. */
export function CategoryGrid({ options, selected, onPick }: Choices) {
  const { m3 } = useTheme();
  const card = useCallback(
    ({ item: c }: { item: Category }) => (
      <ChoiceCard
        label={shortName(c)}
        leading={<EmojiAvatar emoji={c.emoji} colour={c.colour} size={36} />}
        selected={c.id === selected}
        onPress={() => {
          haptics.select();
          onPick(c.id);
        }}
        style={styles.fill}
      />
    ),
    [selected, onPick],
  );
  return (
    <View style={styles.grid}>
      <FlatList
        data={options}
        keyExtractor={keyOf}
        renderItem={card}
        numColumns={2}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.cards}
        ListEmptyComponent={
          <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={styles.none}>
            No categories yet
          </AppText>
        }
      />
      <View style={styles.edit}>
        <Button variant="text" icon="pencil" label="Edit categories" onPress={() => openPage('/categories')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  chips: { flexGrow: 0 },
  chipRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  grid: { height: PAD_HEIGHT },
  columns: { gap: 8 },
  cards: { gap: 8, paddingHorizontal: 16 },
  none: { textAlign: 'center', paddingTop: 24 },
  edit: { alignItems: 'center', marginTop: 4 },
});
