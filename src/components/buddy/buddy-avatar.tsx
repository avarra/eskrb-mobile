import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Text } from '@/components/text';
import { initialOf } from '@/domain/buddy';
import { colors, font } from '@/theme/tokens';

/**
 * A peer's initial on a white disc, blue ink. The nurse's `Avatar` is peach, so a buddy never reads as staff.
 * Sizes 48 (home row) and 72 (buddy header); 96 on the empty screen.
 */
export function BuddyAvatar({ name, size = 48, dim }: { name: string; size?: 48 | 72 | 96; dim?: boolean }) {
  return (
    <View
      style={[styles.disc, { width: size, height: size, borderRadius: size / 2, opacity: dim ? 0.6 : 1 }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="bava" cx="50%" cy="0%" rx="120%" ry="100%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={colors.sheet} />
            <Stop offset="1" stopColor={colors.sheetFill} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} rx={size / 2} fill="url(#bava)" />
      </Svg>
      <Text
        variant="meta"
        color={colors.ground}
        maxFontSizeMultiplier={1}
        style={{ fontFamily: font.bold, fontSize: Math.round(size * 0.416), lineHeight: Math.round(size * 0.55) }}
      >
        {initialOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 8px 18px -10px rgba(0,0,0,0.55)',
  },
});
