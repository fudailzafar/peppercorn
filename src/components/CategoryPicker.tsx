import { useCallback, useImperativeHandle, type Ref } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { shortName } from '../domain/entries';
import type { Category } from '../domain/model';
import { haptics } from '../hooks/haptics';
import { openPage } from '../hooks/nav';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { Button, ChoiceCard, EmojiAvatar, FilterChip } from './material';
import { PAD_HEIGHT } from './NumberPad';

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

export interface CategoryButtonHandle {
  /** Flashes and shakes, when there is none. */
  missing: () => void;
}

/** Opens the grid, and closes it. */
export function CategoryButton({ category, open, onPress, ref }: { category?: Category; open: boolean; onPress: () => void; ref?: Ref<CategoryButtonHandle> }) {
  const shake = useSharedValue(0);
  const flash = useSharedValue(0);
  useImperativeHandle(ref, () => ({
    missing: () => {
      const to = (x: number) => withTiming(x, { duration: 80 });
      shake.set(withSequence(to(-6), to(6), to(-6), to(6), to(-6), to(0)));
      flash.set(withSequence(withTiming(1, { duration: 0 }), withDelay(500, withTiming(0, { duration: 600 }))));
    },
  }));
  const moved = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const shown = useAnimatedStyle(() => ({ opacity: flash.get() }));
  return (
    <Animated.View style={[styles.button, moved]}>
      {open ? (
        <Button variant="outlined" icon="close" label="Close" onPress={onPress} />
      ) : category ? (
        <Button variant="tonal" leading={<AppText size={16}>{category.emoji}</AppText>} label={shortName(category)} accessibilityLabel={`Category: ${category.name}. Change`} onPress={onPress} />
      ) : (
        <>
          <Button variant="outlined" icon="apps-outline" label="Category" accessibilityLabel="Choose category" onPress={onPress} />
          <Animated.View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, shown]}>
            <Button variant="danger" icon="apps-outline" label="Category" onPress={onPress} />
          </Animated.View>
        </>
      )}
    </Animated.View>
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
  button: { minWidth: 120, maxWidth: 168 },
});
