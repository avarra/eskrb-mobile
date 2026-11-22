import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors } from '@/theme/tokens';

const D = 16;

/**
 * One dot of the signature. Open = yellow with a ground-coloured ring (today still open, as on the day ring);
 * done = white. Turning done while mounted springs like the day ring's today-dot and plays the success haptic.
 */
function Dot({ done }: { done: boolean }) {
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(done ? 1 : 0);
  const was = useRef(done);
  useEffect(() => {
    const turnedDone = done && !was.current;
    was.current = done;
    if (!done) {
      fill.set(0);
      return;
    }
    if (!turnedDone || reduceMotion) {
      fill.set(1);
      return;
    }
    fill.set(withSpring(1, { damping: 9, stiffness: 140 }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [done, reduceMotion, fill]);

  const white = useAnimatedStyle(() => ({ transform: [{ scale: fill.get() }] }));
  return (
    <View style={styles.dot}>
      <View style={[StyleSheet.absoluteFill, styles.open]} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.done, white]} />
    </View>
  );
}

/** The signature: you first, then the buddy, joined by a line. Purely visual; the caller gives the a11y text. */
export function TodayDots({ me, buddy }: { me: boolean; buddy: boolean }) {
  return (
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={styles.line} />
      <Dot done={me} />
      <Dot done={buddy} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  line: { position: 'absolute', left: 8, right: 8, top: D / 2 - 1, height: 2, backgroundColor: 'rgba(255,255,255,0.45)' },
  dot: { width: D, height: D },
  open: { borderRadius: D / 2, backgroundColor: colors.today, boxShadow: `0px 0px 0px 3px ${colors.ground}` },
  done: { borderRadius: D / 2, backgroundColor: colors.ink },
});
