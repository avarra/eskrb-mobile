import { describe, expect, it } from 'vitest';

import { sl } from '../../copy/sl';
import { defaultConfigs, exercises } from './catalog';
import { jointAngle, pickSide } from './geometry';
import { LANDMARK_COUNT, LEG, type Landmark, type Pose } from './pose';
import { debounce, debounced, ema } from './smoothing';
import {
  calfStretchInitial,
  createTracker,
  singleLegStanceInitial,
  stepCalfStretch,
  stepSingleLegStance,
  stepWallSquat,
  wallSquatInitial,
  type Tracker,
} from './trackers';

// ---------------------------------------------------------------------------------------------
// Synthetic poses. Thigh and shin are 200 px each (leg length 400 px); y grows downwards.

const SEGMENT = 200;
const FRAME_MS = 33;

type LegSpec = {
  hipX?: number;
  /** Thigh direction in degrees from straight down, positive towards +x. */
  thigh?: number;
  /** Knee angle in degrees (180 = straight). */
  knee?: number;
  /** Direction the person faces along x; the shin folds backwards. */
  facing?: 1 | -1;
  /** Raise the whole leg by this many px. */
  lift?: number;
  likelihood?: number;
  footLikelihood?: number;
};

const HIP_Y = 300;

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function lm(x: number, y: number, likelihood: number): Landmark {
  return { x, y, z: 0, likelihood };
}

function buildLeg(spec: LegSpec) {
  const { hipX = 500, thigh = 0, knee = 180, facing = 1, lift = 0, likelihood = 0.95 } = spec;
  const footLikelihood = spec.footLikelihood ?? likelihood;
  const shin = thigh - facing * (180 - knee);
  const hip = { x: hipX, y: HIP_Y - lift };
  const kneeP = { x: hip.x + SEGMENT * Math.sin(rad(thigh)), y: hip.y + SEGMENT * Math.cos(rad(thigh)) };
  const ankle = { x: kneeP.x + SEGMENT * Math.sin(rad(shin)), y: kneeP.y + SEGMENT * Math.cos(rad(shin)) };
  return {
    hip: lm(hip.x, hip.y, likelihood),
    knee: lm(kneeP.x, kneeP.y, likelihood),
    ankle: lm(ankle.x, ankle.y, likelihood),
    heel: lm(ankle.x - 15 * facing, ankle.y + 10, footLikelihood),
    footIndex: lm(ankle.x + 40 * facing, ankle.y + 15, footLikelihood),
  };
}

function makePose(legs: { left: LegSpec; right: LegSpec }): Pose {
  const landmarks: Landmark[] = Array.from({ length: LANDMARK_COUNT }, () => lm(500, 100, 0.9));
  for (const side of ['left', 'right'] as const) {
    const built = buildLeg(legs[side]);
    const idx = LEG[side];
    landmarks[idx.hip] = built.hip;
    landmarks[idx.knee] = built.knee;
    landmarks[idx.ankle] = built.ankle;
    landmarks[idx.heel] = built.heel;
    landmarks[idx.footIndex] = built.footIndex;
  }
  return { landmarks, width: 1080, height: 1920 };
}

/** Profile view of a wall squat: left leg faces the camera, right leg is partly occluded. */
function squat(knee: number, overrides: { left?: LegSpec; right?: LegSpec } = {}): Pose {
  const thigh = (180 - knee) / 2; // knees travel forward as the hips drop
  return makePose({
    left: { thigh, knee, likelihood: 0.95, ...overrides.left },
    right: { thigh, knee, likelihood: 0.6, ...overrides.right },
  });
}

type Run<S> = { state: S; t: number };

function feed<S>(step: Tracker<S>['step'], from: Run<S>, pose: Pose | undefined, frames: number): Run<S> {
  let { state, t } = from;
  for (let i = 0; i < frames; i++) {
    t += FRAME_MS;
    state = step(state, pose, t);
  }
  return { state, t };
}

// ---------------------------------------------------------------------------------------------

describe('geometry', () => {
  it('measures the joint angle in 2D', () => {
    expect(jointAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 })).toBeCloseTo(180);
    expect(jointAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeCloseTo(90);
  });

  it('builds fixtures with the requested knee angle', () => {
    const pose = squat(95);
    const leg = LEG.left;
    const angle = jointAngle(pose.landmarks[leg.hip]!, pose.landmarks[leg.knee]!, pose.landmarks[leg.ankle]!);
    expect(angle).toBeCloseTo(95);
  });

  it('picks the leg with the highest likelihoods', () => {
    expect(pickSide(squat(180))).toBe('left');
    expect(pickSide(squat(180, { left: { likelihood: 0.6 }, right: { likelihood: 0.95 } }))).toBe('right');
  });
});

describe('smoothing', () => {
  it('ema starts from the first sample and moves towards new ones', () => {
    expect(ema(null, 100, 0.5)).toBe(100);
    expect(ema(100, 80, 0.5)).toBe(90);
  });

  it('debounce needs N consecutive disagreeing frames to flip', () => {
    let d = debounced();
    d = debounce(d, true, 3);
    d = debounce(d, true, 3);
    expect(d.value).toBe(false);
    d = debounce(d, false, 3); // streak broken
    d = debounce(d, true, 3);
    d = debounce(d, true, 3);
    expect(d.value).toBe(false);
    d = debounce(d, true, 3);
    expect(d).toEqual({ value: true, streak: 0 });
  });
});

// ---------------------------------------------------------------------------------------------

describe('wall squat', () => {
  const step = stepWallSquat;
  const start: Run<typeof wallSquatInitial> = { state: wallSquatInitial, t: 0 };

  it('asks to stand straight until the straight gate opens, then asks to bend', () => {
    const one = feed(step, start, squat(180), 1);
    expect(one.state).toMatchObject({ visible: true, status: 'stand-straight', phase: 'waiting', side: 'left' });
    expect(one.state.kneeAngle).toBeCloseTo(180);

    const ready = feed(step, one, squat(180), 3);
    expect(ready.state).toMatchObject({ status: 'bend', phase: 'straight', kneeBent: false, reps: 0 });
  });

  it('counts straight → bent → straight as one rep and tracks the hold', () => {
    let run = feed(step, start, squat(178), 5);
    run = feed(step, run, squat(95), 10);
    expect(run.state).toMatchObject({ phase: 'bent', status: 'hold', kneeBent: true, tooDeep: false, reps: 0 });
    expect(run.state.holdMs).toBeGreaterThan(0);
    const hold = run.state.holdMs;

    run = feed(step, run, squat(95), 30); // ~1 s more
    expect(run.state.holdMs).toBeCloseTo(hold + 30 * FRAME_MS);
    const best = run.state.holdMs;

    run = feed(step, run, squat(178), 10);
    expect(run.state).toMatchObject({ phase: 'straight', status: 'bend', reps: 1, holdMs: 0, kneeBent: false });
    // The hold runs on for a few release frames (smoothing + debounce) before it ends.
    expect(run.state.bestHoldMs).toBeGreaterThanOrEqual(best);
    expect(run.state.bestHoldMs).toBeLessThan(best + 6 * FRAME_MS);
    const firstBest = run.state.bestHoldMs;

    run = feed(step, run, squat(100), 10);
    run = feed(step, run, squat(178), 10);
    expect(run.state.reps).toBe(2);
    expect(run.state.bestHoldMs).toBe(firstBest); // second hold was shorter
  });

  it('does not count a rep when the patient starts already bent', () => {
    const run = feed(step, start, squat(95), 20);
    expect(run.state).toMatchObject({ phase: 'waiting', status: 'stand-straight', kneeBent: true, holdMs: 0, reps: 0 });
  });

  it('ignores a single noisy bent frame', () => {
    let run = feed(step, start, squat(178), 5);
    run = feed(step, run, squat(60), 1);
    run = feed(step, run, squat(178), 5);
    expect(run.state).toMatchObject({ phase: 'straight', kneeBent: false, reps: 0 });
  });

  it('warns when the knee bends past the minimum angle', () => {
    let run = feed(step, start, squat(178), 5);
    run = feed(step, run, squat(60), 10);
    expect(run.state).toMatchObject({ tooDeep: true, status: 'too-deep', kneeBent: true });
    expect(run.state.holdMs).toBeGreaterThan(0);
  });

  it('asks to straighten when rising between the thresholds, ending the hold', () => {
    let run = feed(step, start, squat(178), 5);
    run = feed(step, run, squat(95), 15);
    const best = run.state.bestHoldMs;
    run = feed(step, run, squat(140), 10);
    expect(run.state).toMatchObject({ phase: 'bent', status: 'straighten', kneeBent: false, holdMs: 0, reps: 0 });
    expect(run.state.bestHoldMs).toBeGreaterThanOrEqual(best);
    expect(run.state.bestHoldMs).toBeLessThan(best + 6 * FRAME_MS);
  });

  it('reports not-visible on low likelihood or no pose, keeping reps', () => {
    let run = feed(step, start, squat(178), 5);
    run = feed(step, run, squat(95), 10);
    run = feed(step, run, squat(178), 10);
    expect(run.state.reps).toBe(1);

    const lowVis = squat(178, { left: { likelihood: 0.4 }, right: { likelihood: 0.3 } });
    run = feed(step, run, lowVis, 1);
    expect(run.state).toMatchObject({ visible: false, status: 'not-visible', kneeAngle: null, kneeBent: false, reps: 1 });

    run = feed(step, run, undefined, 1);
    expect(run.state).toMatchObject({ visible: false, status: 'not-visible', reps: 1 });
  });

  it('switches to the other leg when the tracked one is lost', () => {
    let run = feed(step, start, squat(178), 5);
    expect(run.state.side).toBe('left');
    run = feed(step, run, squat(178, { left: { likelihood: 0.2 } }), 1);
    expect(run.state).toMatchObject({ side: 'right', visible: true });
  });
});

// ---------------------------------------------------------------------------------------------

describe('single-leg stance', () => {
  const step = stepSingleLegStance;
  const start: Run<typeof singleLegStanceInitial> = { state: singleLegStanceInitial, t: 0 };
  const standing = makePose({ left: { hipX: 450 }, right: { hipX: 550 } });

  it('asks to lift a leg while both feet are down', () => {
    const run = feed(step, start, standing, 5);
    expect(run.state).toMatchObject({ visible: true, status: 'lift', liftedSide: null, holdMs: 0, kneeBent: false });
  });

  it('detects a lift by ankle height and times the hold', () => {
    const rightUp = makePose({ left: { hipX: 450 }, right: { hipX: 550, lift: 60 } }); // 60 > 0.1 × 400
    let run = feed(step, start, standing, 3);
    run = feed(step, run, rightUp, 2);
    expect(run.state).toMatchObject({ liftedSide: 'right', status: 'lift' }); // debouncing
    run = feed(step, run, rightUp, 1);
    expect(run.state).toMatchObject({ status: 'hold', holdMs: 0 });
    run = feed(step, run, rightUp, 30);
    expect(run.state.holdMs).toBe(30 * FRAME_MS);
    expect(run.state.kneeAngle).toBeCloseTo(180);

    // The gate releases after 3 frames down, so the hold includes the first 2 of them.
    run = feed(step, run, standing, 3);
    expect(run.state).toMatchObject({ status: 'lift', holdMs: 0, liftedSide: null, bestHoldMs: 32 * FRAME_MS });
  });

  it('does not count a small height difference', () => {
    const slight = makePose({ left: { hipX: 450 }, right: { hipX: 550, lift: 30 } }); // 30 < 40
    const run = feed(step, start, slight, 10);
    expect(run.state).toMatchObject({ status: 'lift', liftedSide: null });
  });

  it('detects a lift by knee bend when the ankle is barely raised', () => {
    // Knee at 145° raises the ankle by ~36 px, below the height threshold.
    const leftBent = makePose({ left: { hipX: 450, knee: 145 }, right: { hipX: 550 } });
    const run = feed(step, start, leftBent, 10);
    expect(run.state).toMatchObject({ liftedSide: 'left', status: 'hold', kneeBent: true });
    expect(run.state.kneeAngle).toBeCloseTo(145);
  });

  it('does not treat both knees bent (a squat) as standing on one leg', () => {
    const bothBent = makePose({ left: { hipX: 450, knee: 140 }, right: { hipX: 550, knee: 140 } });
    const run = feed(step, start, bothBent, 10);
    expect(run.state).toMatchObject({ status: 'lift', liftedSide: null });
  });

  it('reports not-visible when a leg drops below the likelihood gate and stops the hold', () => {
    const rightUp = makePose({ left: { hipX: 450 }, right: { hipX: 550, lift: 80 } });
    let run = feed(step, start, rightUp, 10);
    expect(run.state.status).toBe('hold');
    const hidden = makePose({ left: { hipX: 450 }, right: { hipX: 550, lift: 80, likelihood: 0.45 } });
    run = feed(step, run, hidden, 1);
    expect(run.state).toMatchObject({ visible: false, status: 'not-visible', kneeAngle: null, holdMs: 0 });
    expect(run.state.bestHoldMs).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------

describe('calf stretch', () => {
  const step = stepCalfStretch;
  const start: Run<typeof calfStretchInitial> = { state: calfStretchInitial, t: 0 };

  // Facing +x: left foot forward with a bent knee, right leg back and straight.
  const front: LegSpec = { thigh: 20, knee: 140 };
  const back: LegSpec = { thigh: -25, knee: 180 };
  const good = makePose({ left: front, right: back });

  it('holds while staggered, back leg straight and front knee bent', () => {
    let run = feed(step, start, good, 2);
    expect(run.state).toMatchObject({ visible: true, frontSide: 'left', status: 'hold', holdMs: 0, kneeBent: true });
    run = feed(step, run, good, 1);
    expect(run.state.valid.value).toBe(true);
    run = feed(step, run, good, 60);
    expect(run.state.holdMs).toBe(60 * FRAME_MS);
    expect(run.state.kneeAngle).toBeCloseTo(140);
    expect(run.state.backKneeAngle).toBeCloseTo(180);
  });

  it('asks to step back when the feet are together', () => {
    const together = makePose({ left: {}, right: {} });
    const run = feed(step, start, together, 5);
    expect(run.state).toMatchObject({ status: 'stagger', holdMs: 0 });
  });

  it('asks to straighten the back leg', () => {
    const run = feed(step, start, makePose({ left: front, right: { thigh: -25, knee: 150 } }), 5);
    expect(run.state).toMatchObject({ status: 'straighten-back', frontSide: 'left' });
  });

  it('asks to bend the front knee', () => {
    const run = feed(step, start, makePose({ left: { thigh: 15, knee: 180 }, right: back }), 5);
    expect(run.state).toMatchObject({ status: 'bend-front', kneeBent: false });
  });

  it('finds the front leg when facing the other way', () => {
    const mirrored = makePose({
      left: { thigh: 25, knee: 180, facing: -1 },
      right: { thigh: -20, knee: 140, facing: -1 },
    });
    const run = feed(step, start, mirrored, 5);
    expect(run.state).toMatchObject({ frontSide: 'right', status: 'hold' });
  });

  it('falls back to the more bent knee as the front leg when feet are not visible', () => {
    const noFeet = makePose({ left: { ...front, footLikelihood: 0.1 }, right: { ...back, footLikelihood: 0.1 } });
    const run = feed(step, start, noFeet, 5);
    expect(run.state).toMatchObject({ frontSide: 'left', status: 'hold' });
  });

  it('keeps the hold through a single bad frame, ends it on a sustained break', () => {
    const together = makePose({ left: {}, right: {} });
    // The gate opens on frame 3, so the hold starts there.
    let run = feed(step, start, good, 10);
    run = feed(step, run, together, 1);
    expect(run.state).toMatchObject({ status: 'hold' });
    run = feed(step, run, good, 2);
    expect(run.state.holdMs).toBe(10 * FRAME_MS);

    run = feed(step, run, together, 3);
    expect(run.state).toMatchObject({ status: 'stagger', holdMs: 0, bestHoldMs: 12 * FRAME_MS });
  });

  it('reports not-visible on low likelihood', () => {
    let run = feed(step, start, good, 10);
    run = feed(step, run, makePose({ left: { ...front, likelihood: 0.2 }, right: back }), 1);
    expect(run.state).toMatchObject({ visible: false, status: 'not-visible', kneeAngle: null, holdMs: 0 });
  });
});

// ---------------------------------------------------------------------------------------------

describe('catalog and createTracker', () => {
  it('lists each exercise once, in order, with copy for every status', () => {
    expect(exercises.map((e) => e.id)).toEqual(['wall-squat', 'single-leg-stance', 'calf-stretch']);
    for (const e of exercises) expect(sl.exercises[e.id].title).toBeTruthy();
  });

  it('creates trackers with default or custom thresholds', () => {
    const squatTracker = createTracker('wall-squat');
    expect(squatTracker.initial.exercise).toBe('wall-squat');
    let run = feed(squatTracker.step, { state: squatTracker.initial, t: 0 }, squat(178), 5);
    run = feed(squatTracker.step, run, squat(130), 10);
    expect(run.state.kneeBent).toBe(false); // 130 > default bentMax 120

    const lenient = createTracker('wall-squat', { ...defaultConfigs['wall-squat'], bentMax: 135 });
    let lenientRun = feed(lenient.step, { state: lenient.initial, t: 0 }, squat(178), 5);
    lenientRun = feed(lenient.step, lenientRun, squat(130), 10);
    expect(lenientRun.state).toMatchObject({ kneeBent: true, status: 'hold' });
    expect(sl.exercises['wall-squat'].status[lenientRun.state.status]).toBe('Zadržite položaj.');

    expect(createTracker('single-leg-stance').initial.exercise).toBe('single-leg-stance');
    const calf = createTracker('calf-stretch');
    expect(sl.exercises['calf-stretch'].status[calf.initial.status]).toBeTruthy();
  });
});

