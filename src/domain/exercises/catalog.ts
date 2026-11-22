// DEMO CONFIGURATION. These thresholds are generic starting points for a hackathon demo, not
// clinical values. A physiotherapist must set (or confirm) every threshold and target per patient
// before the exercises are used in rehabilitation.

export type ExerciseId = 'wall-squat' | 'single-leg-stance' | 'calf-stretch';

/** Signal conditioning shared by all trackers. */
export type TrackingConfig = {
  /** EMA weight for new knee-angle samples (0..1). */
  readonly smoothingAlpha: number;
  /** Consecutive frames a boolean state must disagree before it flips. */
  readonly debounceFrames: number;
};

export type WallSquatConfig = TrackingConfig & {
  /** Knee counts as straight above this angle (degrees). */
  readonly straightMin: number;
  /** Knee counts as bent below this angle (degrees). */
  readonly bentMax: number;
  /** Warn "too deep" below this angle (degrees). */
  readonly minAngle: number;
};

export type SingleLegStanceConfig = TrackingConfig & {
  /** Lifted if this ankle is higher than the other by more than this fraction of leg length. */
  readonly liftRatio: number;
  /** ...or if its knee angle is below this (degrees). */
  readonly kneeBentMax: number;
};

export type CalfStretchConfig = TrackingConfig & {
  /** Feet must be staggered by more than this fraction of leg length (horizontal gap). */
  readonly staggerRatio: number;
  /** Back knee must be straighter than this (degrees). */
  readonly backStraightMin: number;
  /** Front knee must be bent below this (degrees). */
  readonly frontBentMax: number;
};

export type ConfigById = {
  'wall-squat': WallSquatConfig;
  'single-leg-stance': SingleLegStanceConfig;
  'calf-stretch': CalfStretchConfig;
};

const tracking: TrackingConfig = { smoothingAlpha: 0.5, debounceFrames: 3 };

export const defaultConfigs: { readonly [K in ExerciseId]: ConfigById[K] } = {
  'wall-squat': { ...tracking, straightMin: 160, bentMax: 120, minAngle: 70 },
  'single-leg-stance': { ...tracking, liftRatio: 0.1, kneeBentMax: 150 },
  'calf-stretch': { ...tracking, staggerRatio: 0.3, backStraightMin: 160, frontBentMax: 165 },
};

export type Exercise =
  | { readonly id: 'wall-squat'; readonly goal: 'reps'; readonly targetReps: number; readonly config: WallSquatConfig }
  | {
      readonly id: 'single-leg-stance';
      readonly goal: 'hold';
      readonly targetHoldMs: number;
      readonly config: SingleLegStanceConfig;
    }
  | { readonly id: 'calf-stretch'; readonly goal: 'hold'; readonly targetHoldMs: number; readonly config: CalfStretchConfig };

/** Display order. */
export const exercises: readonly Exercise[] = [
  { id: 'wall-squat', goal: 'reps', targetReps: 10, config: defaultConfigs['wall-squat'] },
  { id: 'single-leg-stance', goal: 'hold', targetHoldMs: 30_000, config: defaultConfigs['single-leg-stance'] },
  { id: 'calf-stretch', goal: 'hold', targetHoldMs: 30_000, config: defaultConfigs['calf-stretch'] },
];
