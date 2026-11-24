import { router } from 'expo-router';
import { View } from 'react-native';
import { Icon } from '../components/Icon';
import { EmojiAvatar, IconAvatar, IconButton, ListItem, Subheader } from '../components/material';
import { PageScaffold } from '../components/SettingsBits';
import { Haptics } from '../lib/haptics';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/theme';

/** Every category as a list: tap to edit, arrows to reorder. The asset categories are fixed. */
export default function Categories() {
  const categories = useStore((s) => s.categories);
  const reorder = useStore((s) => s.reorderCategories);
  const { m3 } = useTheme();

  const section = (income: boolean) => {
    const list = categories.filter((x) => x.income === income && !x.asset).sort((a, b) => a.order - b.order);
    const move = (index: number, delta: number) => {
      const ids = list.map((x) => x.id);
      const target = index + delta;
      if (target < 0 || target >= ids.length) return;
      [ids[index], ids[target]] = [ids[target], ids[index]];
      Haptics.selection();
      reorder(income, ids);
    };
    return (
      <View>
        <Subheader text={income ? 'Income' : 'Expense'} />
        {list.map((cat, i) => (
          <ListItem
            key={cat.id}
            headline={cat.name}
            accessibilityLabel={`Edit ${cat.name}`}
            leading={<EmojiAvatar emoji={cat.emoji} colour={cat.colour} />}
            onPress={() => router.push({ pathname: '/category-edit', params: { id: cat.id } })}
            actions={
              <View style={{ flexDirection: 'row' }}>
                <IconButton icon="chevron-up" onPress={() => move(i, -1)} disabled={i === 0} label={`Move ${cat.name} up`} />
                <IconButton icon="chevron-down" onPress={() => move(i, 1)} disabled={i === list.length - 1} label={`Move ${cat.name} down`} />
              </View>
            }
          />
        ))}
        <ListItem headline="New category" leading={<IconAvatar icon="add" />} onPress={() => router.push({ pathname: '/category-edit', params: { income: income ? '1' : '0' } })} />
      </View>
    );
  };

  return (
    <PageScaffold title="Categories">
      {section(false)}
      {section(true)}
      <Subheader text="Assets (fixed)" />
      {categories
        .filter((x) => x.asset)
        .map((cat) => (
          <ListItem key={cat.id} headline={cat.name} leading={<EmojiAvatar emoji={cat.emoji} colour={cat.colour} />} trailing={<Icon name="lock" size={24} color={m3.onSurfaceVariant} />} />
        ))}
    </PageScaffold>
  );
}
