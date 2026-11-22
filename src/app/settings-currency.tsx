import { goBack } from '../lib/nav';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { SearchBar, StateLayer } from '../components/m3';
import { PageScaffold } from '../components/SettingsBits';
import { currencyCodes } from '../lib/currencies';
import { currencySymbol } from '../lib/format';
import { Haptics } from '../lib/haptics';
import { useStore } from '../lib/store';
import { typeScale } from '../theme/material';
import { useTheme } from '../theme/theme';

function currencyName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export default function CurrencyScreen() {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const current = useStore((s) => s.settings.currency);
  const update = useStore((s) => s.updateSettings);
  const [query, setQuery] = useState('');

  const all = useMemo(() => currencyCodes.map((code) => ({ code, name: currencyName(code), symbol: currencySymbol(code) })), []);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter((x) => x.code.toLowerCase().includes(q) || x.name.toLowerCase().includes(q)) : all;
  }, [all, query]);

  return (
    <PageScaffold title="Currency" scroll={false}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search currencies" autoCapitalize="none" />
      <FlatList
        data={list}
        keyExtractor={(x) => x.code}
        keyboardShouldPersistTaps="handled"
        style={{ marginTop: 8 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              Haptics.selection();
              update({ currency: item.code });
              goBack();
            }}
            android_ripple={{ color: `${m3.onSurface}1F` }}
            style={styles.row}
          >
            {({ pressed }) => (
              <>
                <StateLayer pressed={pressed} color={m3.onSurface} />
                <AppText size={typeScale.titleLarge.size} color={m3.onSurface} style={{ width: 56 }}>
                  {item.symbol}
                </AppText>
                <View style={{ flex: 1 }}>
                  <AppText size={typeScale.bodyLarge.size} color={m3.onSurface} numberOfLines={1}>
                    {item.name}
                  </AppText>
                  <AppText size={typeScale.bodyMedium.size} color={m3.onSurfaceVariant}>
                    {item.code}
                  </AppText>
                </View>
                {item.code === current ? <Icon name="checkmark" size={24} color={m3.primary} /> : null}
              </>
            )}
          </Pressable>
        )}
      />
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, overflow: 'hidden' },
});
