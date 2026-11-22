/**
 * Exponential moving average step. `prev === null` (no history, e.g. after the leg was lost)
 * starts over from `next`. Higher alpha follows the input faster.
 */
export function ema(prev: number | null, next: number, alpha: number): number {
  return prev === null ? next : prev + alpha * (next - prev);
}

/** A boolean that only flips after the raw signal disagrees with it for `frames` consecutive frames. */
export type Debounced = { readonly value: boolean; readonly streak: number };

export function debounced(value = false): Debounced {
  return { value, streak: 0 };
}

export function debounce(state: Debounced, raw: boolean, frames: number): Debounced {
  if (raw === state.value) return state.streak === 0 ? state : { value: state.value, streak: 0 };
  const streak = state.streak + 1;
  return streak >= frames ? { value: raw, streak: 0 } : { value: state.value, streak };
}
