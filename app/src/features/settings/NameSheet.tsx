import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { store } from '@/state/app';
import { useSettings } from '@/state/hooks';
import { AppText } from '@/ui/AppText';
import { BottomSheet, Button, PillField } from '@/ui/material';

export function NameSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { name } = useSettings();
  return (
    <BottomSheet visible={visible} onClose={onClose} bottomInset={insets.bottom}>
      {/* Starts from the saved name each time it opens. */}
      <NameField key={String(visible)} name={name} onClose={onClose} />
    </BottomSheet>
  );
}

function NameField({ name, onClose }: { name: string; onClose: () => void }) {
  const [typed, setTyped] = useState(name);
  const save = () => {
    store.set({ name: typed.trim() });
    onClose();
  };
  return (
    <View style={styles.sheet}>
      <AppText variant="titleLarge">Your name</AppText>
      <PillField icon="person" placeholder="Name" accessibilityLabel="Name" value={typed} onChangeText={setTyped} maxLength={40} autoCapitalize="words" autoFocus returnKeyType="done" onSubmitEditing={save} />
      <Button large label="Save" onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({ sheet: { gap: 20 } });
