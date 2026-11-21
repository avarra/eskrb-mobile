export function nowIso(): string {
  return new Date().toISOString();
}

export type DotState = 'done' | 'today' | 'todayDone' | 'future';

/** States for the 42 dots: elapsed days white, today yellow (white once the check-in is in), the rest faint. */
export function ringStates(day: number, durationDays: number, todayDone: boolean): DotState[] {
  return Array.from({ length: durationDays }, (_, i) => {
    if (i < day - 1) return 'done';
    if (i === day - 1) return todayDone ? 'todayDone' : 'today';
    return 'future';
  });
}
