// Pose shape produced by the native pose detector (ML Kit, accurate model).
// Coordinates are pixels of the upright image: x grows to the right, y grows downwards.

export type Landmark = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** 0..1 confidence that the landmark is present in the frame. */
  readonly likelihood: number;
};

export type Pose = {
  /** 33 landmarks in ML Kit's standard order. */
  readonly landmarks: readonly Landmark[];
  readonly width: number;
  readonly height: number;
};

export const LANDMARK_COUNT = 33;

export const LEFT_SHOULDER = 11;
export const RIGHT_SHOULDER = 12;
export const LEFT_HIP = 23;
export const RIGHT_HIP = 24;
export const LEFT_KNEE = 25;
export const RIGHT_KNEE = 26;
export const LEFT_ANKLE = 27;
export const RIGHT_ANKLE = 28;
export const LEFT_HEEL = 29;
export const RIGHT_HEEL = 30;
export const LEFT_FOOT_INDEX = 31;
export const RIGHT_FOOT_INDEX = 32;

export type Side = 'left' | 'right';

export type LegIndices = {
  readonly hip: number;
  readonly knee: number;
  readonly ankle: number;
  readonly heel: number;
  readonly footIndex: number;
};

export const LEG: Readonly<Record<Side, LegIndices>> = {
  left: { hip: LEFT_HIP, knee: LEFT_KNEE, ankle: LEFT_ANKLE, heel: LEFT_HEEL, footIndex: LEFT_FOOT_INDEX },
  right: { hip: RIGHT_HIP, knee: RIGHT_KNEE, ankle: RIGHT_ANKLE, heel: RIGHT_HEEL, footIndex: RIGHT_FOOT_INDEX },
};

export function otherSide(side: Side): Side {
  return side === 'left' ? 'right' : 'left';
}
