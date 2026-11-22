import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { colors } from '@/theme/tokens';

export type FocusPoint = { x: number; y: number; /** Bumped on every tap so the same spot re-animates. */ id: number };

type Props = {
  point: FocusPoint | null;
  locked: boolean;
  exposure: SharedValue<number>;
  minExposure: number;
  maxExposure: number;
  showExposure: boolean;
};

const BOX = 84;
const TRACK = 120;

/** Yellow focus square at the tapped spot, a sun that tracks exposure beside it, and a lock badge. */
export function FocusIndicator({ point, locked, exposure, minExposure, maxExposure, showExposure }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!point) {
      opacity.set(withTiming(0, { duration: 150 }));
      return;
    }
    scale.set(withSequence(withTiming(1.35, { duration: 0 }), withSpring(1, { damping: 14, stiffness: 220 })));
    opacity.set(locked ? 1 : withSequence(withTiming(1, { duration: 80 }), withDelay(2600, withTiming(0.35, { duration: 400 }))));
  }, [point, locked, opacity, scale]);

  const boxStyle = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scale: scale.get() }] }));
  const sunStyle = useAnimatedStyle(() => {
    const range = maxExposure - minExposure || 1;
    const t = (exposure.get() - minExposure) / range; // 0 = darkest, 1 = brightest
    return { transform: [{ translateY: (0.5 - t) * TRACK }] };
  });

  if (!point) return null;

  return (
    <View pointerEvents="none" style={[styles.anchor, { left: point.x - BOX / 2, top: point.y - BOX / 2 }]}>
      <Animated.View style={[styles.box, boxStyle]} />
      {showExposure && (
        <Animated.View style={[styles.sun, sunStyle]}>
          <Icon name="sun" size={24} color={colors.today} />
        </Animated.View>
      )}
      {locked && (
        <View style={styles.lock} accessibilityLiveRegion="polite">
          <Icon name="lock" size={16} color="#1B1B1B" strokeWidth={2.6} />
          <Text variant="meta" color="#1B1B1B" style={styles.lockText}>
            {sl.camera.locked}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', width: BOX, height: BOX },
  box: { width: BOX, height: BOX, borderWidth: 2, borderColor: colors.today, borderRadius: 6 },
  sun: { position: 'absolute', left: BOX + 10, top: BOX / 2 - 12 },
  lock: {
    position: 'absolute',
    top: -40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.today,
    width: 220,
    left: BOX / 2 - 110,
    justifyContent: 'center',
  },
  lockText: { fontSize: 15, lineHeight: 20 },
});
