// Pure per-frame reducers: (state, pose | undefined, tMs) => state. `pose` is undefined when the
// detector found nobody in the frame. `tMs` is a monotonic timestamp of the frame in milliseconds.

import {
  defaultConfigs,
  type CalfStretchConfig,
  type ConfigById,
  type ExerciseId,
  type SingleLegStanceConfig,
  type WallSquatConfig,
} from './catalog';
import { facingDirection, kneeAngle, legLength, pickSide, visibleLeg, type Leg } from './geometry';
import { otherSide, type Pose, type Side } from './pose';
import { debounce, debounced, ema, type Debounced } from './smoothing';

/** Fields every tracker state exposes to the UI. */
type Common<Status extends string> = {
  /** Smoothed knee angle of the tracked leg in degrees, null while not visible. */
  readonly kneeAngle: number | null;
  readonly kneeBent: boolean;
  readonly visible: boolean;
  readonly status: Status | 'not-visible';
  /** Current hold in ms (0 when not holding). */
  readonly holdMs: number;
  readonly bestHoldMs: number;
};

type Hold = { readonly holdStartMs: number | null; readonly holdMs: number; readonly bestHoldMs: number };

function updateHold(prev: Hold, holding: boolean, tMs: number): Hold {
  if (!holding) return { holdStartMs: null, holdMs: 0, bestHoldMs: prev.bestHoldMs };
  const holdStartMs = prev.holdStartMs ?? tMs;
  const holdMs = tMs - holdStartMs;
  return { holdStartMs, holdMs, bestHoldMs: Math.max(prev.bestHoldMs, holdMs) };
}

const noHold: Hold = { holdStartMs: null, holdMs: 0, bestHoldMs: 0 };

// ---------------------------------------------------------------------------------------------
// Wall squat

export type WallSquatStatus = 'stand-straight' | 'bend' | 'hold' | 'too-deep' | 'straighten';

/** waiting: not yet seen standing straight; straight: ready to go down; bent: went down, rep pending. */
export type WallSquatPhase = 'waiting' | 'straight' | 'bent';

export type WallSquatState = Common<WallSquatStatus> &
  Hold & {
    readonly exercise: 'wall-squat';
    readonly side: Side | null;
    readonly phase: WallSquatPhase;
    readonly reps: number;
    readonly tooDeep: boolean;
    readonly bentGate: Debounced;
    readonly straightGate: Debounced;
  };

export const wallSquatInitial: WallSquatState = {
  exercise: 'wall-squat',
  kneeAngle: null,
  kneeBent: false,
  visible: false,
  status: 'not-visible',
  ...noHold,
  side: null,
  phase: 'waiting',
  reps: 0,
  tooDeep: false,
  bentGate: debounced(),
  straightGate: debounced(),
};

export function stepWallSquat(
  state: WallSquatState,
  pose: Pose | undefined,
  tMs: number,
  config: WallSquatConfig = defaultConfigs['wall-squat'],
): WallSquatState {
  // Stick with the current leg while it stays visible, so the angle doesn't jump between legs.
  const stuck = pose && state.side ? visibleLeg(pose, state.side) : undefined;
  const side = stuck ? state.side : pose ? pickSide(pose) : null;
  const leg = stuck ?? (pose && side ? visibleLeg(pose, side) : undefined);

  if (!leg || !side) {
    return {
      ...state,
      ...updateHold(state, false, tMs),
      kneeAngle: null,
      kneeBent: false,
      visible: false,
      status: 'not-visible',
      tooDeep: false,
      bentGate: debounced(state.bentGate.value),
      straightGate: debounced(state.straightGate.value),
    };
  }

  const angle = ema(side === state.side ? state.kneeAngle : null, kneeAngle(leg), config.smoothingAlpha);
  const bentGate = debounce(state.bentGate, angle < config.bentMax, config.debounceFrames);
  const straightGate = debounce(state.straightGate, angle > config.straightMin, config.debounceFrames);

  let { phase, reps } = state;
  if (phase === 'waiting' && straightGate.value) phase = 'straight';
  else if (phase === 'straight' && bentGate.value) phase = 'bent';
  else if (phase === 'bent' && straightGate.value) {
    phase = 'straight';
    reps += 1;
  }

  const kneeBent = bentGate.value;
  const tooDeep = angle < config.minAngle;
  const hold = updateHold(state, phase === 'bent' && kneeBent, tMs);

  let status: WallSquatStatus;
  if (phase === 'waiting') status = 'stand-straight';
  else if (phase === 'straight') status = 'bend';
  else if (tooDeep) status = 'too-deep';
  else status = kneeBent ? 'hold' : 'straighten';

  return {
    exercise: 'wall-squat',
    kneeAngle: angle,
    kneeBent,
    visible: true,
    status,
    ...hold,
    side,
    phase,
    reps,
    tooDeep,
    bentGate,
    straightGate,
  };
}

// ---------------------------------------------------------------------------------------------
// Single-leg stance

export type SingleLegStanceStatus = 'lift' | 'hold';

export type SingleLegStanceState = Common<SingleLegStanceStatus> &
  Hold & {
    readonly exercise: 'single-leg-stance';
    /** Leg currently off the ground (raw, per frame), or null. */
    readonly liftedSide: Side | null;
    readonly lifted: Debounced;
    readonly angles: { readonly left: number | null; readonly right: number | null };
  };

export const singleLegStanceInitial: SingleLegStanceState = {
  exercise: 'single-leg-stance',
  kneeAngle: null,
  kneeBent: false,
  visible: false,
  status: 'not-visible',
  ...noHold,
  liftedSide: null,
  lifted: debounced(),
  angles: { left: null, right: null },
};

export function stepSingleLegStance(
  state: SingleLegStanceState,
  pose: Pose | undefined,
  tMs: number,
  config: SingleLegStanceConfig = defaultConfigs['single-leg-stance'],
): SingleLegStanceState {
  const left = pose ? visibleLeg(pose, 'left') : undefined;
  const right = pose ? visibleLeg(pose, 'right') : undefined;

  if (!left || !right) {
    return {
      ...state,
      ...updateHold(state, false, tMs),
      kneeAngle: null,
      kneeBent: false,
      visible: false,
      status: 'not-visible',
      liftedSide: null,
      lifted: debounced(state.lifted.value),
      angles: { left: null, right: null },
    };
  }

  const legs: Record<Side, Leg> = { left, right };
  const angles = {
    left: ema(state.angles.left, kneeAngle(left), config.smoothingAlpha),
    right: ema(state.angles.right, kneeAngle(right), config.smoothingAlpha),
  };
  const scale = (legLength(left) + legLength(right)) / 2;

  // y grows downwards, so a raised ankle has the smaller y.
  const raisedByHeight = (side: Side) => legs[otherSide(side)].ankle.y - legs[side].ankle.y > config.liftRatio * scale;
  const raisedByKnee = (side: Side) => angles[side] < config.kneeBentMax;

  let liftedSide: Side | null = null;
  if (raisedByHeight('left')) liftedSide = 'left';
  else if (raisedByHeight('right')) liftedSide = 'right';
  else if (raisedByKnee('left') !== raisedByKnee('right')) liftedSide = raisedByKnee('left') ? 'left' : 'right';

  const lifted = debounce(state.lifted, liftedSide !== null, config.debounceFrames);
  const hold = updateHold(state, lifted.value, tMs);

  // Report the knee of the lifted leg, or of the higher foot while both are down.
  const shown = liftedSide ?? (left.ankle.y <= right.ankle.y ? 'left' : 'right');
  const angle = angles[shown];

  return {
    exercise: 'single-leg-stance',
    kneeAngle: angle,
    kneeBent: angle < config.kneeBentMax,
    visible: true,
    status: lifted.value ? 'hold' : 'lift',
    ...hold,
    liftedSide,
    lifted,
    angles,
  };
}

// ---------------------------------------------------------------------------------------------
// Calf stretch

/** Status names the first failing check, in the order the patient should fix them. */
export type CalfStretchStatus = 'stagger' | 'straighten-back' | 'bend-front' | 'hold';

export type CalfStretchState = Common<CalfStretchStatus> &
  Hold & {
    readonly exercise: 'calf-stretch';
    readonly frontSide: Side | null;
    /** Smoothed back-knee angle; `kneeAngle` is the front knee. */
    readonly backKneeAngle: number | null;
    readonly valid: Debounced;
    readonly angles: { readonly left: number | null; readonly right: number | null };
  };

export const calfStretchInitial: CalfStretchState = {
  exercise: 'calf-stretch',
  kneeAngle: null,
  kneeBent: false,
  visible: false,
  status: 'not-visible',
  ...noHold,
  frontSide: null,
  backKneeAngle: null,
  valid: debounced(),
  angles: { left: null, right: null },
};

export function stepCalfStretch(
  state: CalfStretchState,
  pose: Pose | undefined,
  tMs: number,
  config: CalfStretchConfig = defaultConfigs['calf-stretch'],
): CalfStretchState {
  const left = pose ? visibleLeg(pose, 'left') : undefined;
  const right = pose ? visibleLeg(pose, 'right') : undefined;

  if (!pose || !left || !right) {
    return {
      ...state,
      ...updateHold(state, false, tMs),
      kneeAngle: null,
      kneeBent: false,
      visible: false,
      status: 'not-visible',
      frontSide: null,
      backKneeAngle: null,
      valid: debounced(state.valid.value),
      angles: { left: null, right: null },
    };
  }

  const angles = {
    left: ema(state.angles.left, kneeAngle(left), config.smoothingAlpha),
    right: ema(state.angles.right, kneeAngle(right), config.smoothingAlpha),
  };
  const scale = (legLength(left) + legLength(right)) / 2;
  const staggered = Math.abs(left.ankle.x - right.ankle.x) > config.staggerRatio * scale;

  // Front foot is the one further in the facing direction (heel → toe). Without visible feet,
  // fall back to the more bent knee.
  const facing = facingDirection(pose);
  const frontSide: Side =
    facing !== undefined
      ? (left.ankle.x - right.ankle.x) * facing > 0
        ? 'left'
        : 'right'
      : angles.left <= angles.right
        ? 'left'
        : 'right';
  const front = angles[frontSide];
  const back = angles[otherSide(frontSide)];

  const kneeBent = front < config.frontBentMax;
  let check: CalfStretchStatus;
  if (!staggered) check = 'stagger';
  else if (back <= config.backStraightMin) check = 'straighten-back';
  else if (!kneeBent) check = 'bend-front';
  else check = 'hold';

  const valid = debounce(state.valid, check === 'hold', config.debounceFrames);
  const hold = updateHold(state, valid.value, tMs);

  return {
    exercise: 'calf-stretch',
    kneeAngle: front,
    kneeBent,
    visible: true,
    // Once holding, a few noisy frames shouldn't flash a correction; the gate decides.
    status: valid.value ? 'hold' : check,
    ...hold,
    frontSide,
    backKneeAngle: back,
    valid,
    angles,
  };
}

// ---------------------------------------------------------------------------------------------

export type StateById = {
  'wall-squat': WallSquatState;
  'single-leg-stance': SingleLegStanceState;
  'calf-stretch': CalfStretchState;
};

export type TrackerState = StateById[ExerciseId];

export type Tracker<S> = {
  readonly initial: S;
  readonly step: (state: S, pose: Pose | undefined, tMs: number) => S;
};

const factories: { readonly [K in ExerciseId]: (config: ConfigById[K]) => Tracker<StateById[K]> } = {
  'wall-squat': (config) => ({ initial: wallSquatInitial, step: (s, p, t) => stepWallSquat(s, p, t, config) }),
  'single-leg-stance': (config) => ({
    initial: singleLegStanceInitial,
    step: (s, p, t) => stepSingleLegStance(s, p, t, config),
  }),
  'calf-stretch': (config) => ({ initial: calfStretchInitial, step: (s, p, t) => stepCalfStretch(s, p, t, config) }),
};

/** Tracker for one exercise, using the catalog's default thresholds unless `config` is given. */
export function createTracker<K extends ExerciseId>(id: K, config?: ConfigById[K]): Tracker<StateById[K]> {
  const make: (config: ConfigById[K]) => Tracker<StateById[K]> = factories[id];
  return make(config ?? defaultConfigs[id]);
}
