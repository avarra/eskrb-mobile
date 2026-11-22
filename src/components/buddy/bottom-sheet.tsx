import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sl } from '@/copy/sl';
import { colors, radius, space } from '@/theme/tokens';

/** The buddy screens' bottom sheet: scrim, white sheet with a grab handle, like `ReminderSheet`. Tapping the scrim closes it. */
export function BottomSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={sl.common.close} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.l }]} accessibilityViewIsModal>
          <View style={styles.grab} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(6,18,44,0.55)' },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.side,
    paddingTop: 10,
    boxShadow: '0px -20px 40px -20px rgba(0,0,0,0.4)',
  },
  grab: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.hairline, alignSelf: 'center', marginBottom: 10 },
});
