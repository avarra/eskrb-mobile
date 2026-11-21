import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { ringStates } from '@/domain/day';
import { colors, size as sizes } from '@/theme/tokens';

type Props = {
  day: number;
  total: number;
  todayDone: boolean;
  /** Overall square size; the mockup ring is 340 with the dots on r=156. */
  size?: number;
  /** Play the "today fills white" moment (spring + success haptic) on mount. */
  celebrate?: boolean;
  children?: React.ReactNode;
};

const BASE = sizes.ring;
const R = 156;

/** 42 dots around the start button: elapsed white, today yellow, the rest faint. */
export function DayRing({ day, total, todayDone, size = BASE, celebrate = false, children }: Props) {
  const k = size / BASE;
  const c = size / 2;
  const states = ringStates(day, total, todayDone);
  const pos = (i: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / total;
    return { x: c + R * k * Math.cos(a), y: c + R * k * Math.sin(a) };
  };
  const todayIndex = Math.min(total, Math.max(1, day)) - 1;
  const t = pos(todayIndex);

  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(todayDone && !celebrate ? 1 : 0);
  useEffect(() => {
    if (!todayDone) {
      fill.set(0);
      return;
    }
    if (!celebrate || reduceMotion) {
      fill.set(1);
      return;
    }
    fill.set(withDelay(350, withSpring(1, { damping: 9, stiffness: 140 })));
    const timer = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
    return () => clearTimeout(timer);
  }, [todayDone, celebrate, reduceMotion, fill]);

  const whiteDot = useAnimatedStyle(() => ({ transform: [{ scale: fill.get() }] }));
  const todayR = 9 * k;

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }} accessible={false}>
        {states.map((s, i) => {
          const p = pos(i);
          if (s === 'done') return <Circle key={i} cx={p.x} cy={p.y} r={6 * k} fill={colors.ink} />;
          if (s === 'future') return <Circle key={i} cx={p.x} cy={p.y} r={4 * k} fill={colors.faint} />;
          return <Circle key={i} cx={p.x} cy={p.y} r={todayR} fill={colors.today} stroke={colors.ground} strokeWidth={3 * k} />;
        })}
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: t.x - todayR,
            top: t.y - todayR,
            width: todayR * 2,
            height: todayR * 2,
            borderRadius: todayR,
            backgroundColor: colors.ink,
          },
          whiteDot,
        ]}
      />
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}
