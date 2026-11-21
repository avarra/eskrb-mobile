import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { colors, shadow } from '@/theme/tokens';

type Props = {
  diameter: number;
  onPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
  tone?: 'default' | 'urgent';
  children: React.ReactNode;
  style?: ViewStyle;
};

/** The big round white object lit from the top: start button, dictate button, 112. */
export function Orb({ diameter, onPress, accessibilityLabel, accessibilityHint, disabled, tone = 'default', children, style }: Props) {
  const urgent = tone === 'urgent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          boxShadow: urgent ? shadow.urgentOrb : shadow.orb,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <Svg width={diameter} height={diameter} style={StyleSheet.absoluteFill} accessible={false}>
        <Defs>
          <RadialGradient id="orb" cx="50%" cy="0%" rx="120%" ry="100%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={colors.orbTop} />
            <Stop offset="0.7" stopColor={urgent ? '#FDF5F5' : colors.orbMid} />
            <Stop offset="1" stopColor={urgent ? colors.urgentOrbBottom : colors.orbBottom} />
          </RadialGradient>
        </Defs>
        <Circle cx={diameter / 2} cy={diameter / 2} r={diameter / 2} fill="url(#orb)" />
      </Svg>
      <View style={styles.content}>{children}</View>
    </Pressable>
  );
}

/** Two concentric hairline rings around an orb (dictate, 112). */
export function Rings({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
      <View pointerEvents="none" style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: 'rgba(255,255,255,0.28)' }]} />
      <View
        pointerEvents="none"
        style={[styles.ring, { width: size - 52, height: size - 52, borderRadius: (size - 52) / 2, borderColor: 'rgba(255,255,255,0.45)' }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16 },
  ring: { position: 'absolute', borderWidth: 2 },
});
