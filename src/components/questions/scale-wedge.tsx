import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { colors, font, heatFor, shadow, size } from '@/theme/tokens';

type Props = {
  min: number;
  max: number;
  value: number | undefined;
  onChange: (v: number) => void;
  /** Words per value from `min` (pain 0–10 or wellbeing 1–5). */
  words: readonly { word: string; line: string }[];
  label: string;
  /** 'heat' warms with the value (pain only: peach and coral belong to pain). 'calm' stays white. */
  tone?: 'heat' | 'calm';
};

const T = size.thumb; // 84
const CALM = { fill: colors.ink, ink: colors.ground, pill: colors.ink, wash: null, low: 'rgba(255,255,255,0.35)' } as const;
const TRACK = 56;

function wedgePoints(w: number): string {
  // clip-path: polygon(0 40%, 100% 0, 100% 100%, 0 60%) on a 56-tall band centred in the 84-tall row.
  const top = (T - TRACK) / 2;
  return `0,${top + TRACK * 0.4} ${w},${top} ${w},${top + TRACK} 0,${top + TRACK * 0.6}`;
}

/** The wedge slider from pain.png: thickens to the right, warms with the value, snaps to integers. */
export function ScaleWedge({ min, max, value, onChange, words, label, tone = 'heat' }: Props) {
  const range = max - min;
  const [width, setWidth] = useState(0);
  const travel = Math.max(1, width - T);
  const shown = value ?? min;
  const touched = value !== undefined;
  const heat = tone === 'heat' ? heatFor(shown - min, range) : CALM;
  const word = words[shown - min] ?? words[0];
  const reduceMotion = useReducedMotion();

  const pos = useSharedValue(0); // thumb left edge, 0..travel
  const last = useSharedValue(shown);
  const widthSV = useSharedValue(travel);

  useEffect(() => {
    widthSV.set(travel);
    const target = ((shown - min) / range) * travel;
    pos.set(reduceMotion ? target : withTiming(target, { duration: 160 }));
    last.set(shown);
  }, [shown, travel, min, range, reduceMotion, pos, last, widthSV]);

  const pick = (v: number) => {
    onChange(v);
    Haptics.selectionAsync();
  };

  const follow = (x: number) => {
    'worklet';
    const p = Math.min(Math.max(x - T / 2, 0), widthSV.get());
    pos.set(p);
    const v = Math.round((p / widthSV.get()) * range) + min;
    if (v !== last.get()) {
      last.set(v);
      scheduleOnRN(pick, v);
    }
  };

  // Drag anywhere on the track, or tap a spot: both snap to the nearest integer.
  const pan = usePanGesture({
    minDistance: 2,
    onActivate: (e) => {
      'worklet';
      follow(e.x);
    },
    onUpdate: (e) => {
      'worklet';
      follow(e.x);
    },
    onFinalize: () => {
      'worklet';
      pos.set(withSpring(((last.get() - min) / range) * widthSV.get(), { damping: 18, stiffness: 260 }));
    },
  });
  const tap = useTapGesture({
    onActivate: (e) => {
      'worklet';
      follow(e.x);
      pos.set(withSpring(((last.get() - min) / range) * widthSV.get(), { damping: 18, stiffness: 260 }));
    },
  });
  const gesture = useCompetingGestures(pan, tap);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pos.get() }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: pos.get() + T / 2 }));

  const step = (d: number) => {
    const v = Math.min(max, Math.max(min, shown + d));
    if (v !== value) pick(v);
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View>
      <View style={[styles.heatPill, { backgroundColor: heat.pill, opacity: touched ? 1 : 0 }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={styles.heatDot} />
        <Text variant="bodyStrong" color={colors.heatPillInk}>
          {word.word}
        </Text>
      </View>
      <View style={styles.valueRow} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text variant="painNumber" maxFontSizeMultiplier={1} style={{ fontVariant: ['tabular-nums'], opacity: touched ? 1 : 0.35, marginTop: -12, marginBottom: -34, paddingRight: 12 }}>
          {shown}
        </Text>
        <Text variant="body" color={colors.ink2} style={styles.line}>
          {touched ? word.line : ''}
        </Text>
      </View>

      <GestureDetector gesture={gesture}>
        <View
          onLayout={onLayout}
          style={styles.slider}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityHint={sl.checkin.scaleHint}
          accessibilityValue={{ min, max, now: shown, text: touched ? `${shown}, ${word.word}` : undefined }}
          accessibilityActions={[
            { name: 'increment', label: sl.checkin.increase },
            { name: 'decrement', label: sl.checkin.decrease },
          ]}
          onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        >
          {width > 0 && (
            <>
              <Svg width={width} height={T} style={StyleSheet.absoluteFill}>
                <Polygon points={wedgePoints(width)} fill="rgba(255,255,255,0.16)" />
              </Svg>
              <Animated.View style={[styles.fillClip, fillStyle]}>
                <Svg width={width} height={T}>
                  <Defs>
                    <LinearGradient id="heat" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
                      <Stop offset="0" stopColor={tone === 'heat' ? colors.heatLow : CALM.low} />
                      <Stop offset="1" stopColor={heat.fill} />
                    </LinearGradient>
                  </Defs>
                  <Polygon points={wedgePoints(width)} fill={touched ? 'url(#heat)' : 'transparent'} />
                </Svg>
              </Animated.View>
              <Animated.View style={[styles.thumb, thumbStyle]}>
                <Text
                  variant="title"
                  maxFontSizeMultiplier={1}
                  color={touched ? heat.ink : colors.sheetInk2}
                  style={{ fontFamily: font.bold, letterSpacing: -0.7 }}
                >
                  {touched ? shown : '·'}
                </Text>
              </Animated.View>
            </>
          )}
        </View>
      </GestureDetector>

      <View style={styles.nums} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {width > 0 &&
          Array.from({ length: range + 1 }, (_, i) => {
            const on = touched && i + min === shown;
            return (
              <Text
                key={i}
                variant="metaStrong"
                maxFontSizeMultiplier={1.2}
                color={on ? colors.ink : colors.ink2}
                align="center"
                style={[styles.num, { left: T / 2 + (i / range) * travel - 18 }, on && { fontFamily: font.bold }]}
              >
                {i + min}
              </Text>
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heatPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
  heatDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.heatPillInk },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  line: { flex: 1, paddingBottom: 18 },
  slider: { height: T, marginTop: 28 },
  fillClip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  thumb: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: T,
    height: T,
    borderRadius: T / 2,
    backgroundColor: colors.orbTop,
    boxShadow: shadow.thumb,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nums: { height: 30, marginTop: 14 },
  num: { position: 'absolute', width: 36 },
});
