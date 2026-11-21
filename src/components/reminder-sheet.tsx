import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { colors, radius, size, space } from '@/theme/tokens';

/** One-time ask for notification permission, with one sentence on why. */
export function ReminderSheet({ visible, onAnswer }: { visible: boolean; onAnswer: (allow: boolean) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onAnswer(false)}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.l }]} accessibilityViewIsModal>
          <Text variant="entryTitle" color={colors.sheetInk} accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32 }}>
            {sl.home.remindTitle}
          </Text>
          <Text variant="body" color={colors.sheetInk2} style={{ marginTop: 8 }}>
            {sl.home.remindBody}
          </Text>
          <Pressable
            onPress={() => onAnswer(true)}
            accessibilityRole="button"
            accessibilityLabel={sl.home.remindAllow}
            style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
          >
            <Text variant="buttonStrong" align="center">
              {sl.home.remindAllow}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onAnswer(false)}
            accessibilityRole="button"
            accessibilityLabel={sl.home.remindLater}
            style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]}
          >
            <Text variant="button" color={colors.ground} align="center">
              {sl.home.remindLater}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,33,69,0.45)' },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.side,
    paddingTop: 28,
  },
  primary: {
    marginTop: 24,
    minHeight: size.pill,
    borderRadius: radius.pill,
    backgroundColor: colors.ground,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  secondary: { marginTop: 8, minHeight: size.pill, justifyContent: 'center' },
});
