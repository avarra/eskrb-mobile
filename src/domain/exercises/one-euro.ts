// One-Euro filter (Casiez et al., 2012): a low-pass filter whose cutoff rises with speed. Slow or
// still points get heavy smoothing (no jitter), fast movement gets little (no lag). Used to steady
// pose landmarks frame to frame.

export type OneEuroParams = {
  /** Cutoff (Hz) when still. Lower = smoother but laggier at rest. */
  readonly minCutoff: number;
  /** How much the cutoff grows with speed (per unit/s). Higher = less lag when moving. */
  readonly beta: number;
  /** Cutoff (Hz) for the speed estimate itself. */
  readonly dCutoff: number;
};

/** Tuned for screen/image pixels at ~10-30 fps. */
export const pixelParams: OneEuroParams = { minCutoff: 1.0, beta: 0.02, dCutoff: 1.0 };

type AxisState = { readonly value: number; readonly speed: number };

function smoothingFactor(cutoffHz: number, dtS: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dtS);
}

function stepAxis(prev: AxisState, raw: number, dtS: number, p: OneEuroParams): AxisState {
  const rawSpeed = (raw - prev.value) / dtS;
  const aD = smoothingFactor(p.dCutoff, dtS);
  const speed = prev.speed + aD * (rawSpeed - prev.speed);
  const cutoff = p.minCutoff + p.beta * Math.abs(speed);
  const a = smoothingFactor(cutoff, dtS);
  return { value: prev.value + a * (raw - prev.value), speed };
}

export type FilterPoint = { readonly x: number; readonly y: number; readonly visible: boolean };
export type FilteredPoint = { readonly x: number; readonly y: number } | null;

type Slot = { readonly x: AxisState; readonly y: AxisState; readonly tMs: number };

/**
 * Filters a fixed-length list of 2D points (e.g. 33 landmarks) over time. A point that briefly
 * drops out holds its last position (no blinking); after `staleMs` it returns null, and when it
 * comes back it restarts from its raw position instead of sliding over from where it was.
 */
export function createPointFilter(params: OneEuroParams = pixelParams, staleMs = 400) {
  let slots: (Slot | null)[] = [];

  return {
    apply(points: readonly FilterPoint[], tMs: number): FilteredPoint[] {
      const next: (Slot | null)[] = [];
      const out = points.map((pt, i): FilteredPoint => {
        const prev = slots[i] ?? null;
        if (!pt.visible) {
          const fresh = prev && tMs - prev.tMs <= staleMs ? prev : null;
          next[i] = fresh;
          return fresh ? { x: fresh.x.value, y: fresh.y.value } : null;
        }
        const dtS = prev ? (tMs - prev.tMs) / 1000 : 0;
        let slot: Slot;
        if (!prev || dtS <= 0 || tMs - prev.tMs > staleMs) {
          slot = { x: { value: pt.x, speed: 0 }, y: { value: pt.y, speed: 0 }, tMs };
        } else {
          slot = { x: stepAxis(prev.x, pt.x, dtS, params), y: stepAxis(prev.y, pt.y, dtS, params), tMs };
        }
        next[i] = slot;
        return { x: slot.x.value, y: slot.y.value };
      });
      slots = next;
      return out;
    },
    reset() {
      slots = [];
    },
  };
}
