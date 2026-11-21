import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';

type Props = {
  variant?: 'blue' | 'urgent';
  /** Warm wash rising from the bottom (pain slider). rgba string or null. */
  wash?: string | null;
  children?: React.ReactNode;
  style?: ViewStyle;
};

/** The saturated field every screen sits on, lit softly from the top. */
export function Ground({ variant = 'blue', wash = null, children, style }: Props) {
  const urgent = variant === 'urgent';
  return (
    <View style={[styles.fill, { backgroundColor: urgent ? colors.urgent : colors.ground }, style]}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
        <Defs>
          {urgent && (
            <LinearGradient id="u" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.urgentTop} />
              <Stop offset="1" stopColor={colors.urgentBottom} />
            </LinearGradient>
          )}
          <RadialGradient id="top" cx="50%" cy="0%" rx="130%" ry="55%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={urgent ? colors.urgentGlow : '#FFFFFF'} stopOpacity={urgent ? 1 : 0.1} />
            <Stop offset="0.7" stopColor={urgent ? colors.urgentGlow : '#FFFFFF'} stopOpacity={0} />
          </RadialGradient>
          {wash && (
            <RadialGradient id="wash" cx="50%" cy="108%" rx="120%" ry="45%" fx="50%" fy="108%">
              <Stop offset="0" stopColor={wash} />
              <Stop offset="0.7" stopColor={wash} stopOpacity={0} />
            </RadialGradient>
          )}
        </Defs>
        {urgent && <Rect width="100%" height="100%" fill="url(#u)" />}
        <Rect width="100%" height="100%" fill="url(#top)" />
        {wash && <Rect width="100%" height="100%" fill="url(#wash)" />}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
