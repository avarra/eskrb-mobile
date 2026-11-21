import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { decimal } from '@/domain/format';
import { colors, font, shadow } from '@/theme/tokens';

const STEP = 0.1;

/** Huge "37,2 °C" between big − and + buttons, 0.1 steps. */
export function NumberStepper({ value, unit, onChange, label, min = 34, max = 42 }: {
  value: number;
  unit: string;
  onChange: (v: number) => void;
  label: string;
  min?: number;
  max?: number;
}) {
  const set = (d: number) => {
    const v = Math.round((value + d) * 10) / 10;
    if (v < min || v > max) return;
    onChange(v);
    Haptics.selectionAsync();
  };
  const spoken = `${decimal(value)} ${unit}`;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: spoken }}
      accessibilityActions={[
        { name: 'increment', label: sl.checkin.increase },
        { name: 'decrement', label: sl.checkin.decrease },
      ]}
      onAccessibilityAction={(e) => set(e.nativeEvent.actionName === 'increment' ? STEP : -STEP)}
    >
      <RoundButton icon="minus" label={sl.checkin.minus} onPress={() => set(-STEP)} />
      <View style={styles.value}>
        <Text variant="painNumber" maxFontSizeMultiplier={1} adjustsFontSizeToFit numberOfLines={1} style={styles.number}>
          {decimal(value)}
        </Text>
        <Text variant="title" color={colors.ink2} maxFontSizeMultiplier={1.2}>
          {unit}
        </Text>
      </View>
      <RoundButton icon="plus" label={sl.checkin.plus} onPress={() => set(STEP)} />
    </View>
  );
}

function RoundButton({ icon, label, onPress }: { icon: 'minus' | 'plus'; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.round, pressed && { transform: [{ scale: 0.94 }] }]}
    >
      <Icon name={icon} size={36} color={colors.ground} strokeWidth={2.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  value: { flex: 1, alignItems: 'center' },
  number: { fontSize: 76, lineHeight: 88, letterSpacing: -2, fontFamily: font.semibold, fontVariant: ['tabular-nums'] },
  round: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.sheet,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.object,
  },
});
