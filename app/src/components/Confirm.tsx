import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { shape } from '../theme/material';
import { useTheme, withAlpha } from '../theme/theme';
import { AppText } from './AppText';
import { Button } from './material';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirm?: string;
  cancel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks before something that can't be taken back. */
export function Confirm({ visible, title, message, confirm = 'Delete', cancel = 'Cancel', destructive = true, onConfirm, onCancel }: Props) {
  const { m3 } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.fill}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(m3.scrim, 0.32) }]} onPress={onCancel} accessibilityLabel="Dismiss" accessibilityRole="button" />
        <View style={[styles.dialog, { backgroundColor: m3.surfaceContainerHigh }]} accessibilityViewIsModal>
          <AppText variant="headlineSmall" accessibilityRole="header">
            {title}
          </AppText>
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={styles.message}>
            {message}
          </AppText>
          <View style={styles.actions}>
            <Button variant="text" label={cancel} onPress={onCancel} />
            <Button variant={destructive ? 'dangerText' : 'text'} label={confirm} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 360, padding: 24, borderRadius: shape.extraLarge },
  message: { marginTop: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
});
