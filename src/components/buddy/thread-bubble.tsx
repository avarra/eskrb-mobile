import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import type { BuddyMessage } from '@/data/api';
import { colors, font } from '@/theme/tokens';

/** The only colour the buddy design adds: a cheer bubble's outline, between sheetFill and ground. */
export const CHEER_LINE = '#C9D8F5';

type Props = {
  message: BuddyMessage;
  /** "Marija" or "Vi", for the screen reader. */
  who: string;
  /** "danes ob 16.05", for the screen reader. */
  when: string;
  /** Just sent: "Pozdrav · poslano" and a short blue halo. */
  landed?: boolean;
  /** Long-press / accessibility action on the buddy's messages. */
  onReport?: () => void;
};

/** One message in the thread: the buddy's (left, sheetFill), mine (right, ground) or a cheer (white with an outline). */
export function ThreadBubble({ message, who, when, landed, onReport }: Props) {
  const mine = message.fromMe;
  const cheer = message.kind === 'cheer';
  const reduceMotion = useReducedMotion();
  const halo = useSharedValue(0);
  useEffect(() => {
    if (!landed || reduceMotion) return;
    halo.set(withSequence(withTiming(1, { duration: 220 }), withTiming(1, { duration: 900 }), withTiming(0, { duration: 500 })));
  }, [landed, reduceMotion, halo]);
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.get() }));

  const label = cheer ? sl.buddy.cheerA11y(who, when, message.text) : sl.buddy.bubbleA11y(who, when, message.text);
  const reportable = !mine && !!onReport;
  const ink = cheer ? (mine ? colors.ground : colors.sheetInk) : mine ? colors.ink : colors.sheetInk;

  return (
    <Pressable
      onLongPress={reportable ? onReport : undefined}
      delayLongPress={500}
      accessible
      accessibilityLabel={label}
      accessibilityActions={reportable ? [{ name: 'report', label: sl.buddy.report.a11yAction }] : undefined}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'report' && onReport?.()}
      style={[styles.wrap, mine ? styles.right : styles.left]}
    >
      <View
        style={[
          styles.bubble,
          cheer ? (mine ? styles.cheerMine : styles.cheerTheirs) : mine ? styles.mine : styles.theirs,
          !cheer && (mine ? styles.tailRight : styles.tailLeft),
        ]}
      >
        {landed && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.halo, haloStyle]} />}
        {cheer && (
          <Text variant="meta" color={mine ? colors.ground : colors.sheetInk2} style={styles.small}>
            {landed ? sl.buddy.cheerSent : sl.buddy.cheer}
          </Text>
        )}
        <Text variant="body" color={ink} style={cheer ? styles.cheerText : styles.text}>
          {message.text}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '82%' },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end' },
  bubble: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 24 },
  theirs: { backgroundColor: colors.sheetFill },
  mine: { backgroundColor: colors.ground },
  tailLeft: { borderBottomLeftRadius: 8 },
  tailRight: { borderBottomRightRadius: 8 },
  cheerTheirs: { backgroundColor: colors.sheet, boxShadow: `inset 0px 0px 0px 2.5px ${CHEER_LINE}` },
  cheerMine: { backgroundColor: colors.sheet, boxShadow: `inset 0px 0px 0px 2.5px ${colors.ground}` },
  halo: { borderRadius: 24, boxShadow: '0px 0px 0px 8px rgba(22,82,196,0.12)' },
  small: { fontFamily: font.medium, fontSize: 16, lineHeight: 21, letterSpacing: 0.3, marginBottom: 2 },
  text: { lineHeight: 28 },
  cheerText: { fontFamily: font.medium, fontSize: 22, lineHeight: 30 },
});
