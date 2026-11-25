import { StyleSheet, View } from 'react-native';
import { backKey, padShown, type Key, type Keypad } from '@/domain/keypad';
import { haptics } from '@/lib/haptics';
import { useMoney } from '@/state/hooks';
import { IconButton } from '@/ui/material';
import { BigAmount } from './BigAmount';

/** The amount being typed, with backspace at the edge, level with it. */
export function TypedAmount({ pad, onKey, income = false, unit }: { pad: Keypad; onKey: (key: Key) => void; income?: boolean; unit?: string }) {
  const { code } = useMoney();
  return (
    <View style={styles.amount}>
      <BigAmount digits={padShown(pad, code)} currency={code} size={57} centred income={income} unit={unit} />
      {pad.typing === 'point' && pad.text !== '' ? (
        <View style={styles.back}>
          <IconButton
            icon="backspace-outline"
            label="Delete digit"
            onPress={() => {
              haptics.tap();
              onKey(backKey);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 60 },
  back: { position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center' },
});
