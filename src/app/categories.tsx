import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { StateLayer } from '../components/m3';
import { PageScaffold } from '../components/SettingsBits';
import { Haptics } from '../lib/haptics';
import { useStore } from '../lib/store';
import type { Category } from '../lib/types';
import { shape, typeScale } from '../theme/material';
import { useTheme, withAlpha } from '../theme/theme';

/** Manage categories: tap to edit, use the arrows to reorder. */
export default function CategoriesScreen() {
  const categories = useStore((s) => s.categories);
  const reorder = useStore((s) => s.reorderCategories);
  const { m3 } = useTheme();

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
      <View style={{ marginTop: 8 }}>
        <AppText size={typeScale.labelLarge.size} weight="semibold" color={m3.onSurfaceVariant} style={styles.subheader}>
          {income ? 'Income' : 'Expense'}
        </AppText>
        {list.map((cat: Category, i) => (
          <View key={cat.id} style={styles.row}>
            <Pressable
              style={styles.rowMain}
              android_ripple={{ color: `${m3.onSurface}1F` }}
              onPress={() => router.push({ pathname: '/category-edit', params: { id: cat.id } })}
              accessibilityLabel={`Edit ${cat.name}`}
            >
              {({ pressed }) => (
                <>
                  <StateLayer pressed={pressed} color={m3.onSurface} />
                  <View style={[styles.avatar, { backgroundColor: withAlpha(cat.colour, 0.3) }]}>
                    <AppText size={20} style={{ includeFontPadding: false }}>
                      {cat.emoji}
                    </AppText>
                  </View>
                  <AppText size={typeScale.bodyLarge.size} color={m3.onSurface} style={{ marginLeft: 16, flex: 1 }} numberOfLines={1}>
                    {cat.name}
                  </AppText>
                </>
              )}
            </Pressable>
            <Pressable onPress={() => move(i, -1)} style={[styles.move, { opacity: i === 0 ? 0.38 : 1 }]} accessibilityLabel="Move up" android_ripple={{ color: `${m3.onSurface}1F`, radius: 20 }}>
              <Icon name="chevron-up" size={24} color={m3.onSurfaceVariant} />
            </Pressable>
            <Pressable onPress={() => move(i, 1)} style={[styles.move, { opacity: i === list.length - 1 ? 0.38 : 1 }]} accessibilityLabel="Move down" android_ripple={{ color: `${m3.onSurface}1F`, radius: 20 }}>
              <Icon name="chevron-down" size={24} color={m3.onSurfaceVariant} />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={() => router.push({ pathname: '/category-edit', params: { income: income ? '1' : '0' } })}
          android_ripple={{ color: `${m3.onSurface}1F` }}
          style={styles.rowMain}
        >
          {({ pressed }) => (
            <>
              <StateLayer pressed={pressed} color={m3.onSurface} />
              <View style={[styles.avatar, { backgroundColor: m3.surfaceContainerHigh }]}>
                <Icon name="add" size={24} color={m3.onSurfaceVariant} />
              </View>
              <AppText size={typeScale.bodyLarge.size} color={m3.onSurfaceVariant} style={{ marginLeft: 16 }}>
                New category
              </AppText>
            </>
          )}
        </Pressable>
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

const styles = StyleSheet.create({
  subheader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, letterSpacing: 0.1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
  rowMain: { flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, overflow: 'hidden' },
  avatar: { width: 40, height: 40, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  move: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
});
