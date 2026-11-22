import { Pressable, StyleSheet, View } from 'react-native';

import { sl } from '@/copy/sl';
import { colors, shadow, size } from '@/theme/tokens';

import { BuddyIcon } from './buddy-icons';

/** Home's top-right entry to the buddy chat: a tonal disc with two people, and the yellow dot when something is unread. */
export function BuddyButton({ unread, onPress }: { unread: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={unread ? sl.buddy.home.buttonUnread : sl.buddy.home.button}
      hitSlop={6}
      style={({ pressed }) => [styles.disc, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
    >
      <BuddyIcon name="pair" color={colors.ink} />
      {unread && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disc: {
    width: size.control,
    height: size.control,
    borderRadius: size.control / 2,
    backgroundColor: colors.tonal,
    boxShadow: shadow.tonal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.today,
    boxShadow: `0px 0px 0px 2px ${colors.ground}`,
  },
});
