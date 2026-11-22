import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import type { TrackerState } from '@/domain/exercises/trackers';
import { colors, radius, space } from '@/theme/tokens';

function statusText(state: TrackerState): string {
  switch (state.exercise) {
    case 'wall-squat':
      return sl.exercises['wall-squat'].status[state.status];
    case 'single-leg-stance':
      return sl.exercises['single-leg-stance'].status[state.status];
    case 'calf-stretch':
      return sl.exercises['calf-stretch'].status[state.status];
  }
}

const seconds = (ms: number) => Math.floor(ms / 1000);

/** Big knee-bent indicator, angle, the exercise's coaching line, and reps or hold time. */
export function TrackerPanel({ state, error, style }: { state: TrackerState; error: string | null; style?: ViewStyle }) {
  const bent = state.visible && state.kneeBent;
  const warn = state.exercise === 'wall-squat' && state.tooDeep;

  return (
    <View style={[styles.panel, style]}>
      <View style={styles.row}>
        <View
          style={[styles.badge, { backgroundColor: !state.visible ? colors.tonal : bent ? colors.today : colors.ink }]}
          accessibilityLiveRegion="polite"
        >
          <Text variant="bodyStrong" color={state.visible ? colors.sheetInk : colors.ink}>
            {!state.visible ? sl.exerciseLive.noDetection : bent ? sl.exerciseLive.kneeBent : sl.exerciseLive.kneeStraight}
          </Text>
        </View>
        <Text variant="title" accessibilityLabel={state.kneeAngle === null ? undefined : sl.exerciseLive.angleA11y(Math.round(state.kneeAngle))}>
          {state.kneeAngle === null ? '–' : `${Math.round(state.kneeAngle)}°`}
        </Text>
      </View>

      <Text variant="body" color={warn ? colors.heatHigh : colors.ink} accessibilityLiveRegion="polite">
        {statusText(state)}
      </Text>

      <View style={styles.row}>
        {state.exercise === 'wall-squat' ? (
          <Text variant="metaStrong">{sl.exercises.reps(state.reps)}</Text>
        ) : (
          <Text variant="metaStrong">{sl.exercises.hold(seconds(state.holdMs))}</Text>
        )}
        <Text variant="meta" color={colors.ink2}>
          {sl.exercises.bestHold(seconds(state.bestHoldMs))}
        </Text>
      </View>

      {error ? (
        <Text variant="meta" color={colors.heatHigh}>
          {sl.exerciseLive.error}
        </Text>
      ) : null}
      <Text variant="meta" color={colors.ink2}>
        {sl.exercises.suitability}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: space.m,
    paddingTop: space.xl,
    paddingHorizontal: space.side,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: 'rgba(12,33,69,0.82)',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m },
  badge: { paddingHorizontal: space.l, paddingVertical: space.s, borderRadius: radius.pill },
});
