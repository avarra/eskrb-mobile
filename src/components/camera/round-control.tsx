import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { colors, size } from '@/theme/tokens';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Lit state (yellow) for toggles that are on. */
  active?: boolean;
  style?: ViewStyle;
};

/** 56pt round translucent button used for every camera control. */
export function RoundControl({ icon, label, onPress, active, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      hitSlop={4}
      style={({ pressed }) => [styles.base, active && styles.active, pressed && styles.pressed, style]}
    >
      <Icon name={icon} color={active ? '#1B1B1B' : colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: size.control,
    height: size.control,
    borderRadius: size.control / 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: colors.today },
  pressed: { transform: [{ scale: 0.94 }] },
});
