import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { colors, radius, shadow, size } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'tonal' | 'outline';
  icon?: IconName;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  busy?: boolean;
  selected?: boolean;
  /** `checkbox` for multi-select options (announced as checked / not checked). */
  role?: 'button' | 'checkbox';
  /** Text colour for the solid variant (blue by default, red on the urgent screen). */
  solidInk?: string;
  style?: ViewStyle;
};

/** Full-width pill, 68 tall. Solid white = the one primary action; tonal = secondary. */
export function PillButton({
  label,
  onPress,
  variant = 'tonal',
  icon,
  accessibilityLabel,
  accessibilityHint,
  disabled,
  busy,
  selected,
  role = 'button',
  solidInk = colors.ground,
  style,
}: Props) {
  const solid = variant === 'solid';
  const ink = solid ? solidInk : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy, ...(role === 'checkbox' ? { checked: !!selected } : { selected }) }}
      style={({ pressed }) => [
        styles.base,
        solid ? styles.solid : variant === 'outline' ? styles.outline : styles.tonal,
        (disabled && !busy) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.row}>
        {busy ? (
          <ActivityIndicator color={ink} />
        ) : (
          <>
            {icon && <Icon name={icon} color={ink} />}
            <Text variant={solid ? 'buttonStrong' : 'button'} color={ink} align="center" style={styles.label}>
              {label}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: size.pill,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  label: { flexShrink: 1 },
  solid: { backgroundColor: colors.sheet },
  tonal: { backgroundColor: colors.tonal, boxShadow: shadow.tonal },
  outline: { boxShadow: 'inset 0px 0px 0px 2.5px rgba(255,255,255,0.85)' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
