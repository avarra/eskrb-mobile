import * as Haptics from 'expo-haptics';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { createPoseDetector } from 'react-native-pose-detector';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  CommonResolutions,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
} from 'react-native-vision-camera';
import { scheduleOnRN } from 'react-native-worklets';

import { PoseOverlay } from '@/components/exercise/pose-overlay';
import { TrackerPanel } from '@/components/exercise/tracker-panel';
import { Icon } from '@/components/icon';
import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { exercises, type ExerciseId } from '@/domain/exercises/catalog';
import { isVisible } from '@/domain/exercises/geometry';
import { createPointFilter, type FilteredPoint } from '@/domain/exercises/one-euro';
import type { Pose, Side } from '@/domain/exercises/pose';
import { uprightToView } from '@/domain/exercises/preview-map';
import { createTracker, type TrackerState } from '@/domain/exercises/trackers';
import { colors, space } from '@/theme/tokens';

function isExerciseId(value: unknown): value is ExerciseId {
  return typeof value === 'string' && exercises.some((e) => e.id === value);
}

export default function ExerciseLiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!isExerciseId(id)) {
    return (
      <Screen>
        <Text variant="quote">{sl.exerciseLive.unknown}</Text>
        <PillButton label={sl.common.back} onPress={() => router.back()} />
      </Screen>
    );
  }
  return <LiveTracking exerciseId={id} />;
}

/** The leg the tracker is reasoning about, for the angle label on the overlay. */
function trackedSide(state: TrackerState): Side | null {
  switch (state.exercise) {
    case 'wall-squat':
      return state.side;
    case 'single-leg-stance':
      return state.liftedSide;
    case 'calf-stretch':
      return state.frontSide;
  }
}

function LiveTracking({ exerciseId }: { exerciseId: ExerciseId }) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const isFocused = useIsFocused();
  const { hasPermission, requestPermission } = useCameraPermission();

  // Default to the front camera: the phone stands on the floor facing the patient, who watches it.
  const [position, setPosition] = useState<'front' | 'back'>('front');
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = position === 'front' ? (frontDevice ?? backDevice) : (backDevice ?? frontDevice);

  const tracker = useMemo(() => createTracker(exerciseId), [exerciseId]);
  const trackerState = useRef<TrackerState>(tracker.initial);
  const [state, setState] = useState<TrackerState>(tracker.initial);
  // Landmarks in preview (screen) coordinates, smoothed, for the overlay.
  const [points, setPoints] = useState<FilteredPoint[]>([]);
  // Separate filters: the tracker reasons in upright image pixels, the overlay in screen points.
  const [trackerFilter] = useState(() => createPointFilter());
  const [viewFilter] = useState(() => createPointFilter());
  const [error, setError] = useState<string | null>(null);

  // New lens → new viewpoint, so start the tracker over (the exercise itself is fixed per mount).
  const flip = () => {
    Haptics.selectionAsync();
    trackerState.current = tracker.initial;
    setState(tracker.initial);
    setPoints([]);
    trackerFilter.reset();
    viewFilter.reset();
    setPosition((p) => (p === 'front' ? 'back' : 'front'));
  };

  // A rep or a newly started hold gets a light tap so the patient doesn't need to watch the screen.
  const prev = useRef(state);
  useEffect(() => {
    const before = prev.current;
    prev.current = state;
    if (state.exercise === 'wall-squat' && before.exercise === 'wall-squat' && state.reps > before.reps) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (state.holdMs > 0 && before.holdMs === 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [state]);

  const onPose = (next: Pose | null) => {
    const t = performance.now();
    let smoothed: Pose | undefined;
    let view: FilteredPoint[] = [];
    if (next) {
      const visible = next.landmarks.map((l) => isVisible(l));
      // Smooth upright image coordinates before the tracker sees them (steadier angles and states).
      const upright = trackerFilter.apply(
        next.landmarks.map((l, i) => ({ x: l.x, y: l.y, visible: visible[i] })),
        t,
      );
      smoothed = {
        ...next,
        landmarks: next.landmarks.map((l, i) => {
          const f = upright[i];
          return f ? { ...l, x: f.x, y: f.y } : l;
        }),
      };
      // Upright image pixels → preview points (aspect-fill, mirrored for the front camera).
      const image = { width: next.width, height: next.height };
      const raw = next.landmarks.map((l, i) => ({
        ...uprightToView(l, image, window, position === 'front'),
        visible: visible[i],
      }));
      view = viewFilter.apply(raw, t);
    }
    // No person this frame: leave the filters alone; they restart by themselves after a long gap.
    const s = tracker.step(trackerState.current, smoothed, t);
    trackerState.current = s;
    setState(s);
    setPoints(view);
  };
  const onError = (message: string) => setError(message);

  // One ML Kit client per screen. Hybrid objects can be captured by the frame worklet.
  const detector = useMemo(() => createPoseDetector(), []);

  const frameOutput = useFrameOutput({
    // CPU-accessible YUV is what ML Kit consumes; VGA keeps the accurate model near real time.
    pixelFormat: 'yuv',
    targetResolution: CommonResolutions.VGA_16_9,
    // The accurate model is slower than the camera; dropped frames are expected, not an error.
    onFrameDropped: () => {},
    onFrame(frame) {
      'worklet';
      try {
        const detected = detector.detect(frame);
        scheduleOnRN(onPose, detected ?? null);
      } catch (e) {
        scheduleOnRN(onError, e instanceof Error ? e.message : String(e));
      } finally {
        frame.dispose();
      }
    },
  });

  if (!hasPermission || !device) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={sl.common.close} style={styles.closeRow}>
          <Icon name="close" />
          <Text variant="topBar">{sl.common.close}</Text>
        </Pressable>
        <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
          <Text variant="quote">{device ? sl.exerciseLive.noPermission : sl.camera.noDevice}</Text>
          {device && <PillButton variant="solid" label={sl.camera.allow} onPress={() => requestPermission()} />}
        </View>
      </Screen>
    );
  }

  const copy = sl.exercises[exerciseId];
  const canFlip = !!frontDevice && !!backDevice;

  return (
    <View style={styles.root}>
      {/* Bias the session toward the frame output so preview and frames share an aspect ratio (overlay alignment). */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused}
        outputs={[frameOutput]}
        constraints={[{ resolutionBias: frameOutput }]}
      />
      <PoseOverlay
        points={points}
        width={window.width}
        height={window.height}
        highlightSide={trackedSide(state)}
        kneeAngle={state.kneeAngle}
        kneeBent={state.kneeBent}
      />

      <View style={[styles.top, { paddingTop: insets.top + space.s }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={sl.common.close}
          hitSlop={8}
          style={({ pressed }) => [styles.roundButton, pressed && { opacity: 0.6 }]}
        >
          <Icon name="close" />
        </Pressable>
        <Text variant="topBar" style={styles.title} numberOfLines={1}>
          {copy.title}
        </Text>
        {canFlip ? (
          <Pressable
            onPress={flip}
            accessibilityRole="button"
            accessibilityLabel={sl.camera.flip}
            hitSlop={8}
            style={({ pressed }) => [styles.roundButton, pressed && { opacity: 0.6 }]}
          >
            <Icon name="flip" />
          </Pressable>
        ) : (
          <View style={styles.roundButton} />
        )}
      </View>

      <TrackerPanel state={state} error={error} style={{ paddingBottom: insets.bottom + space.l }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  closeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.l,
  },
  title: { flex: 1, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
