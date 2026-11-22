import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Icon } from '../components/Icon';
import { AppText } from '../components/AppText';
import { EmojiTile } from '../components/Bits';
import { PageScaffold } from '../components/SettingsBits';
import { Haptics } from '../lib/haptics';
import { useStore } from '../lib/store';
import type { Category } from '../lib/types';
import { useTheme } from '../theme/theme';

/** Manage categories: tap to edit, use the arrows to reorder. */
export default function CategoriesScreen() {
  const categories = useStore((s) => s.categories);
  const reorder = useStore((s) => s.reorderCategories);
  const { c } = useTheme();

  const section = (income: boolean) => {
    const list = categories.filter((x) => x.income === income).sort((a, b) => a.order - b.order);
    const move = (index: number, delta: number) => {
      const ids = list.map((x) => x.id);
      const target = index + delta;
      if (target < 0 || target >= ids.length) return;
      [ids[index], ids[target]] = [ids[target], ids[index]];
      Haptics.selection();
      reorder(income, ids);
    };
    return (
      <View style={{ marginTop: 16 }}>
        <AppText size={17} weight="semibold" color="SubtitleText" style={{ marginLeft: 6, marginBottom: 8 }}>
          {income ? 'INCOME' : 'EXPENSE'}
        </AppText>
        <View style={{ backgroundColor: c.Settings, borderRadius: 20, paddingVertical: 4 }}>
          {list.map((cat: Category, i) => (
            <View key={cat.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 }}>
              <Pressable
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => router.push({ pathname: '/category-edit', params: { id: cat.id } })}
                accessibilityLabel={`Edit ${cat.name}`}
              >
                <EmojiTile emoji={cat.emoji} colour={cat.colour} size={40} />
                <AppText size={21} weight="medium" style={{ marginLeft: 12, flex: 1 }} numberOfLines={1}>
                  {cat.name}
                </AppText>
              </Pressable>
              <Pressable onPress={() => move(i, -1)} hitSlop={8} style={{ padding: 6, opacity: i === 0 ? 0.25 : 1 }} accessibilityLabel="Move up">
                <Icon name="chevron-up" size={22} color={c.SubtitleText} />
              </Pressable>
              <Pressable onPress={() => move(i, 1)} hitSlop={8} style={{ padding: 6, opacity: i === list.length - 1 ? 0.25 : 1 }} accessibilityLabel="Move down">
                <Icon name="chevron-down" size={22} color={c.SubtitleText} />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() => router.push({ pathname: '/category-edit', params: { income: income ? '1' : '0' } })}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.SecondaryBackground, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="add" size={24} color={c.SubtitleText} />
            </View>
            <AppText size={21} weight="medium" color="SubtitleText" style={{ marginLeft: 12 }}>
              New Category
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <PageScaffold title="Categories">
      {section(false)}
      {section(true)}
    </PageScaffold>
  );
}
