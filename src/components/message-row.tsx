import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { STAFF } from '@/config';
import { sl } from '@/copy/sl';
import { clock } from '@/domain/format';
import { colors, shadow } from '@/theme/tokens';

/** "Sestra Petra · Vam je pisala ob 10.14" with the yellow unread dot. */
export function MessageRow({ createdAt, onPress }: { createdAt: string; onPress: () => void }) {
  const time = clock(createdAt);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sl.home.unreadA11y(STAFF.shortName, time)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <Avatar initials={STAFF.initials} />
      <View style={styles.text}>
        <Text variant="bodyStrong">{STAFF.shortName}</Text>
        <Text variant="meta" color={colors.ink2} style={{ fontSize: 17 }}>
          {sl.home.wroteAt(time)}
        </Text>
      </View>
      <View style={styles.dot} />
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
