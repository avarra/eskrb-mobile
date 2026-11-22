import { LEG, type Landmark, type Pose, type Side } from './pose';

/** Landmarks below this likelihood are treated as not visible. */
export const MIN_LIKELIHOOD = 0.5;

type Point = { readonly x: number; readonly y: number };

export function isVisible(landmark: Landmark | undefined): landmark is Landmark {
  return landmark !== undefined && landmark.likelihood >= MIN_LIKELIHOOD;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Angle at `b` formed by a-b-c, in degrees (0..180), ignoring depth. */
export function jointAngle(a: Point, b: Point, c: Point): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const lengths = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (lengths === 0) return 0;
  const cos = (abx * cbx + aby * cby) / lengths;
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

export type Leg = { readonly hip: Landmark; readonly knee: Landmark; readonly ankle: Landmark };

/** Hip, knee and ankle of one leg, or undefined unless all three pass the visibility gate. */
export function visibleLeg(pose: Pose, side: Side): Leg | undefined {
  const idx = LEG[side];
  const hip = pose.landmarks[idx.hip];
  const knee = pose.landmarks[idx.knee];
  const ankle = pose.landmarks[idx.ankle];
  if (!isVisible(hip) || !isVisible(knee) || !isVisible(ankle)) return undefined;
  return { hip, knee, ankle };
}

export function kneeAngle(leg: Leg): number {
  return jointAngle(leg.hip, leg.knee, leg.ankle);
}

/** Thigh plus shin length in pixels; constant-ish while the leg bends, so useful as a body-size scale. */
export function legLength(leg: Leg): number {
  return distance(leg.hip, leg.knee) + distance(leg.knee, leg.ankle);
}

function legLikelihood(pose: Pose, side: Side): number {
  const idx = LEG[side];
  return [idx.hip, idx.knee, idx.ankle].reduce((sum, i) => sum + (pose.landmarks[i]?.likelihood ?? 0), 0);
}

/**
 * For a profile camera view: the leg facing the camera, i.e. the one whose hip, knee and ankle
 * likelihoods sum highest. Ties go to the left leg.
 */
export function pickSide(pose: Pose): Side {
  return legLikelihood(pose, 'right') > legLikelihood(pose, 'left') ? 'right' : 'left';
}

/**
 * Which way the person faces along the x axis (+1 right, -1 left), from heel → toe of the visible
 * feet. Undefined when no foot is visible.
 */
export function facingDirection(pose: Pose): 1 | -1 | undefined {
  let dx = 0;
  let seen = false;
  for (const side of ['left', 'right'] as const) {
    const heel = pose.landmarks[LEG[side].heel];
    const toe = pose.landmarks[LEG[side].footIndex];
    if (isVisible(heel) && isVisible(toe)) {
      dx += toe.x - heel.x;
      seen = true;
    }
  }
  if (!seen || dx === 0) return undefined;
  return dx > 0 ? 1 : -1;
}
