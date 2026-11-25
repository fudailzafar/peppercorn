import { StyleSheet, View } from 'react-native';
import { ownCategories } from '@/domain/entries';
import type { Category } from '@/domain/model';
import { haptics } from '@/lib/haptics';
import { openPage } from '@/lib/navigation';
import { store } from '@/state/app';
import { useData } from '@/state/hooks';
import { useTheme } from '@/theme/theme';
import { Icon } from '@/ui/Icon';
import { EmojiAvatar, IconAvatar, IconButton, ListItem, Subheader } from '@/ui/material';
import { Page } from '@/ui/Page';

/** Every category: tap to edit, arrows to reorder. The ones behind the assets are fixed. */
export function CategoriesScreen() {
  const { m3 } = useTheme();
  const data = useData();
  return (
    <Page title="Categories">
      <Kind title="Expense" income={false} list={ownCategories(data, false)} />
      <Kind title="Income" income list={ownCategories(data, true)} />
      <Subheader text="Assets (fixed)" />
      {data.categories
        .filter((c) => c.asset)
        .map((c) => (
          <ListItem key={c.id} headline={c.name} leading={<EmojiAvatar emoji={c.emoji} colour={c.colour} />} trailing={<Icon name="lock" color={m3.onSurfaceVariant} />} />
        ))}
    </Page>
  );
}

function Kind({ title, income, list }: { title: string; income: boolean; list: readonly Category[] }) {
  const move = (c: Category, by: number) => {
    haptics.select();
    store.moveCategory(c.id, by);
  };
  return (
    <>
      <Subheader text={title} />
      {list.map((c, i) => (
        <ListItem
          key={c.id}
          headline={c.name}
          leading={<EmojiAvatar emoji={c.emoji} colour={c.colour} />}
          onPress={() => openPage({ pathname: '/edit-category', params: { id: c.id } })}
          actions={
            <View style={styles.row}>
              <IconButton icon="chevron-up" label={`Move ${c.name} up`} disabled={i === 0} onPress={() => move(c, -1)} />
              <IconButton icon="chevron-down" label={`Move ${c.name} down`} disabled={i === list.length - 1} onPress={() => move(c, 1)} />
            </View>
          }
        />
      ))}
      <ListItem headline="New category" leading={<IconAvatar icon="add" />} onPress={() => openPage({ pathname: '/edit-category', params: income ? { income: '1' } : {} })} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
