import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { colors, shadow } from '@/theme/tokens';

import { BuddyAvatar } from './buddy-avatar';

/** Home entry point: "Marija · Nov pozdrav ob 16.05" with the yellow unread dot. Same pill as `MessageRow`. */
export function BuddyRow({ name, line, unread, onPress }: { name: string; line: string; unread: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sl.buddy.home.a11y(name, line)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <BuddyAvatar name={name} />
      <View style={styles.text}>
        <Text variant="bodyStrong">{name}</Text>
        <Text variant="meta" color={colors.ink2} style={{ fontSize: 17 }}>
          {line}
        </Text>
      </View>
      {unread && <View style={styles.dot} />}
      <Icon name="chev" color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 76,
    paddingLeft: 14,
    paddingRight: 16,
    paddingVertical: 10,
    borderRadius: 38,
    backgroundColor: colors.tonal,
    boxShadow: shadow.tonal,
    marginTop: 22,
  },
  text: { flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.today },
});
