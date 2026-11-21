import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { colors, size } from '@/theme/tokens';

type Props = {
  onBack?: () => void;
  kind?: 'back' | 'close';
  right?: string;
  rightA11y?: string;
};

/** "‹ Nazaj" or "× Zapri" on the left, optional step counter on the right. 56 tall. */
export function TopBar({ onBack, kind = 'back', right, rightA11y }: Props) {
  const label = kind === 'close' ? sl.common.close : sl.common.back;
  return (
    <View style={styles.bar}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={label}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
        >
          <Icon name={kind === 'close' ? 'close' : 'back'} color={colors.ink} />
          <Text variant="topBar">{label}</Text>
        </Pressable>
      ) : (
        <View />
      )}
      {right ? (
        <Text variant="topBar" accessibilityLabel={rightA11y}>
          {right}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: size.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: size.control, paddingRight: 12 },
});
