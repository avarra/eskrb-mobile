import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { colors, size } from '@/theme/tokens';

import { BuddyIcon, type BuddyIconName } from './buddy-icons';

type Props = {
  label: string;
  onPress: () => void;
  /** solid = ground with white ink (the one action on a white sheet); tonal = sheetFill; outline = ground ring; ghost = text only. */
  variant: 'solid' | 'tonal' | 'outline' | 'ghost';
  icon?: IconName | BuddyIconName;
  disabled?: boolean;
  busy?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

const buddyIcons: readonly string[] = ['wave', 'more', 'kbd', 'pair'];

/** The 64 px buttons on a white sheet (composer, cheer and confirm sheets). `PillButton` is for the blue ground. */
export function SheetButton({ label, onPress, variant, icon, disabled, busy, accessibilityLabel, style }: Props) {
  const ink = variant === 'solid' ? colors.ink : variant === 'ghost' ? colors.sheetInk : colors.ground;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      style={({ pressed }) => [styles.base, styles[variant], disabled && !busy && styles.off, pressed && styles.pressed, style]}
    >
      {busy ? (
        <ActivityIndicator color={ink} />
      ) : (
        <View style={styles.row}>
          {icon &&
            (buddyIcons.includes(icon) ? <BuddyIcon name={icon as BuddyIconName} color={ink} /> : <Icon name={icon as IconName} color={ink} />)}
          <Text variant={variant === 'ghost' ? 'button' : 'buttonStrong'} color={ink} align="center" style={{ flexShrink: 1 }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: size.reply, borderRadius: size.reply / 2, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  solid: { backgroundColor: colors.ground },
  tonal: { backgroundColor: colors.sheetFill },
  outline: { boxShadow: `inset 0px 0px 0px 2.5px ${colors.ground}` },
  ghost: { minHeight: size.control },
  off: { opacity: 0.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
