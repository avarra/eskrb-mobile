import { differenceInCalendarDays, format, parseISO } from 'date-fns';

import { sl } from '../copy/sl';

/** "Sobota, 21. november" */
export function longDate(d: Date = new Date()): string {
  return `${sl.weekdays[d.getDay()]}, ${d.getDate()}. ${sl.months[d.getMonth()]}`;
}

/** "17. november 2026" */
export function fullDate(d: Date): string {
  return `${d.getDate()}. ${sl.months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Slovenian clock: "10.14", "9.02". */
export function clock(iso: string | Date): string {
  const d = typeof iso === 'string' ? parseISO(iso) : iso;
  return format(d, 'H.mm');
}

/** "danes 10.14" / "včeraj 18.40" / "17. november 9.02" */
export function relativeWhen(iso: string, now: Date = new Date()): { day: string; time: string } {
  const d = parseISO(iso);
  const diff = differenceInCalendarDays(now, d);
  const day = diff === 0 ? sl.common.today : diff === 1 ? sl.common.yesterday : `${d.getDate()}. ${sl.months[d.getMonth()]}`;
  return { day, time: clock(d) };
}

/** "Včeraj ob 18.40" (capitalised, for entry metadata). */
export function whenLine(iso: string, now: Date = new Date()): string {
  const { day, time } = relativeWhen(iso, now);
  const s = sl.common.at(day, time);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** 37.4 → "37,4" */
export function decimal(n: number, digits = 1): string {
  return n.toFixed(digits).replace('.', ',');
}
