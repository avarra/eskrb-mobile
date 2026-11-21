import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

/** Local calendar date as yyyy-MM-dd. */
export function isoDay(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function shiftDay(day: string, days: number): string {
  return isoDay(addDays(parseISO(day), days));
}

/** Day N of the recovery. Surgery on the 17th makes the 21st day 4 (DIRECTION.md); the surgery day itself counts as day 1. */
export function dayNumber(startDate: string, durationDays: number, today: Date = new Date()): number {
  const n = differenceInCalendarDays(today, parseISO(startDate));
  return Math.min(durationDays, Math.max(1, n));
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

export function uid(): string {
  const rnd = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rnd()}${rnd()}`;
}
