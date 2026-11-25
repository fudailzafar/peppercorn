import { StyleSheet, View } from 'react-native';
import { messages, store } from '@/state/app';
import { Empty } from '@/ui/Empty';
import { Button } from '@/ui/material';

async function retry() {
  if (!(await store.open())) messages.warn('Still couldn’t open it.');
}

/** In place of the app while its data can't be opened: carrying on without it would write over it. */
export function LockedScreen() {
  return (
    <View style={styles.centred}>
      <Empty icon="alert-circle" title="Couldn’t open your data" text="It’s still on this phone, and nothing has been changed. Try again, or restart your phone.">
        <Button label="Try again" onPress={retry} />
      </Empty>
    </View>
  );
}

const styles = StyleSheet.create({ centred: { flex: 1, justifyContent: 'center' } });
