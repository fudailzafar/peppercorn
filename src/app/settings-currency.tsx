import { goBack } from '../lib/nav';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { PageScaffold } from '../components/SettingsBits';
import { currencyCodes } from '../lib/currencies';
import { currencySymbol } from '../lib/format';
import { Haptics } from '../lib/haptics';
import { useStore } from '../lib/store';
import { fontFamily, useTheme } from '../theme/theme';

function currencyName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export default function CurrencyScreen() {
  const { c } = useTheme();
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.SecondaryBackground, borderRadius: 14, paddingHorizontal: 14, marginBottom: 10 }}>
        <Icon name="search" size={20} color={c.SubtitleText} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search currencies"
          placeholderTextColor={c.SubtitleText}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, fontSize: 19, paddingVertical: 12, color: c.PrimaryText, fontFamily: fontFamily.medium }}
        />
      </View>
      <FlatList
        data={list}
        keyExtractor={(x) => x.code}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              Haptics.selection();
              update({ currency: item.code });
              goBack();
            }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 12, backgroundColor: pressed ? c.SecondaryBackground : 'transparent' })}
          >
            <AppText size={22} weight="semibold" style={{ width: 48 }}>
              {item.symbol}
            </AppText>
            <View style={{ flex: 1 }}>
              <AppText size={19} weight="medium" numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText size={14} weight="medium" color="SubtitleText">
                {item.code}
              </AppText>
            </View>
            {item.code === current ? <Icon name="checkmark-circle" size={24} color={c.IncomeGreen} /> : null}
          </Pressable>
        )}
      />
    </PageScaffold>
  );
}
