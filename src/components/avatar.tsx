import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Text } from '@/components/text';
import { colors, font } from '@/theme/tokens';

/** The nurse's initials on a warm disc. */
export function Avatar({ initials, size = 48 }: { initials: string; size?: number }) {
  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="ava" x1="0.3" y1="0" x2="0.7" y2="1">
            <Stop offset="0" stopColor={colors.avatarTop} />
            <Stop offset="1" stopColor={colors.avatarBottom} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} rx={size / 2} fill="url(#ava)" />
      </Svg>
      <View style={styles.center}>
        <Text
          variant="meta"
          color={colors.avatarInk}
          maxFontSizeMultiplier={1}
          style={{ fontFamily: font.bold, fontSize: Math.round(size * 0.375), lineHeight: Math.round(size * 0.5) }}
        >
          {initials}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
