import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { colors } from '@/theme/tokens';

/** "Zdravstvene težave? Pišite ekipi." on every live thread, 18 px, underlined. Opens the care-team messages. */
export function SafetyLine() {
  return (
    <Pressable
      onPress={() => router.push('/notes')}
      accessibilityRole="link"
      accessibilityLabel={sl.buddy.safety}
      accessibilityHint={sl.buddy.safetyHint}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <Text variant="metaStrong" color={colors.sheetInk} style={styles.text}>
        {sl.buddy.safety}
      </Text>
      <Icon name="chev" size={22} color={colors.sheetInk2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderTopWidth: 1.5,
    borderTopColor: colors.hairline,
    marginTop: 12,
    paddingVertical: 6,
  },
  text: { flex: 1, textDecorationLine: 'underline', textDecorationColor: colors.sheetInk2 },
});
