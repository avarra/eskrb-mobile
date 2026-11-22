// Pure buddy ("kolega") logic: which cheers to offer, the nudge card, text validation, the today-dots and error copy.
// The server owns the facts, the moments (without any time-of-day rule) and the cheer catalogue; the phone applies
// the nudge hour and picks what to show (docs/buddy.md, "Client / server split").
import { sl } from '../copy/sl';
import { BUDDY_TEXT_MAX, type BuddyMessage, type BuddyState, type Cheer, type MomentKey } from '../data/api';

/** Reminder-type cheers and the nudge card only show from this local hour on. */
export const NUDGE_HOUR = 17;
export const MAX_CHEERS = 4;

/** Optimistic thread items carry this id prefix until the server answers. */
export const PENDING_PREFIX = 'pending:';

const NUDGE_MOMENTS: ReadonlySet<string> = new Set<MomentKey>(['not_checked_in', 'missed_days']);
const MILESTONE = /^(streak_|day_)|^returned$|^both_checked_in$/;

/** Order of the moment-specific cheers: nudge, then milestones, then "checked in". */
function rank(c: Cheer): number {
  if (c.nudge || NUDGE_MOMENTS.has(c.moment)) return 0;
  if (MILESTONE.test(c.moment)) return 1;
  if (c.moment === 'checked_in') return 2;
  return 3;
}

/** The pair can only congratulate: the buddy finished, or the pair is over. */
export function onlyCongratulate(state: BuddyState): boolean {
  return state.status === 'ended' || !!state.buddy?.finished;
}

/** The moments that apply now, after the phone's own rules (its check-in, the nudge hour). */
export function activeMoments({ state, myCheckInDone, now }: { state: BuddyState; myCheckInDone: boolean; now: Date }): Set<string> {
  const m = new Set<string>(state.moments);
  if (myCheckInDone && state.buddy?.checkedInToday) m.add('both_checked_in');
  if (now.getHours() < NUDGE_HOUR) m.delete('not_checked_in');
  return m;
}

/**
 * Up to four cheers for the "Pozdrav" sheet: the ones that fit the buddy's situation first, then evergreen ones.
 * A finished buddy or an ended pair only gets the `finished` cheer (the server sends nothing else then anyway).
 */
export function pickCheers({ state, myCheckInDone, now }: { state: BuddyState; myCheckInDone: boolean; now: Date }): Cheer[] {
  if (onlyCongratulate(state)) {
    return state.buddy?.finished ? state.cheers.filter((c) => c.moment === 'finished').slice(0, 1) : [];
  }
  if (state.status !== 'active') return [];
  const moments = activeMoments({ state, myCheckInDone, now });
  const specific = state.cheers
    .filter((c) => c.moment !== 'always' && c.moment !== 'finished' && moments.has(c.moment))
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i)
    .map(({ c }) => c);
  const evergreen = state.cheers.filter((c) => c.moment === 'always');
  return [...specific, ...evergreen].slice(0, MAX_CHEERS);
}

/** The `not_checked_in` cheer the nudge card sends, if it is on offer now. */
export function nudgeCheer(state: BuddyState): Cheer | undefined {
  return state.cheers.find((c) => c.moment === 'not_checked_in');
}

/**
 * The quiet in-app card "Marija: današnji pregled še ni oddan." Only after the nudge hour, for a running pair whose
 * buddy has not checked in today. The server already left `not_checked_in` out of `moments` when it shouldn't apply.
 */
export function showNudgeCard({ state, now }: { state: BuddyState; now: Date }): boolean {
  const b = state.buddy;
  return (
    state.status === 'active' &&
    !!b &&
    !b.finished &&
    !b.checkedInToday &&
    now.getHours() >= NUDGE_HOUR &&
    state.moments.includes('not_checked_in') &&
    !!nudgeCheer(state)
  );
}

export type TextCheck = 'ok' | 'empty' | 'tooLong' | 'link';

const LINK = /https?:|www\./i;

/** Shapes the composer only; the server stays authoritative (same rules: 1–300 characters, no links). */
export function validateBuddyText(text: string): TextCheck {
  const t = text.trim();
  if (!t) return 'empty';
  if (t.length > BUDDY_TEXT_MAX) return 'tooLong';
  if (LINK.test(t)) return 'link';
  return 'ok';
}

export type TodayDot = 'open' | 'done';
export type TodayDots = { me: TodayDot; buddy: TodayDot };

/** The signature: you first, then the buddy. Open = today's check-in still to come (yellow), done = sent (white). */
export function todayDots(myDone: boolean, buddyDone: boolean): TodayDots {
  return { me: myDone ? 'done' : 'open', buddy: buddyDone ? 'done' : 'open' };
}

/** Which line goes next to the dots. Never says how many days anyone missed. */
export type PairLine = 'both' | 'meOnly' | 'buddyOnly' | 'neither';
export function pairLine(myDone: boolean, buddyDone: boolean): PairLine {
  if (myDone && buddyDone) return 'both';
  if (myDone) return 'meOnly';
  if (buddyDone) return 'buddyOnly';
  return 'neither';
}

/** "Dan 6 · 3 dni zapored": the streak only from 2 on. */
export function showStreak(streak: number): boolean {
  return streak >= 2;
}

/** Adds messages to the thread by id (a re-fetched message replaces the old copy), oldest first. */
export function mergeMessages(current: BuddyMessage[], incoming: BuddyMessage[]): BuddyMessage[] {
  if (!incoming.length) return current;
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

/** The newest unread message from the buddy (for the home row), given the unread count from the server. */
export function latestFromBuddy(messages: BuddyMessage[] | undefined): BuddyMessage | undefined {
  if (!messages) return undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && !m.fromMe) return m;
  }
  return undefined;
}

export type BuddyErrorKey = 'cheerCap' | 'nudgeCap' | 'askCap' | 'textRate' | 'notNow' | 'ended' | 'alreadySent' | 'link' | 'tooLong' | 'failed';

/**
 * The server's 409/429 `detail` is English today; map it to a Slovenian copy key. Unknown answers fall back to
 * `failed` (or to the status' meaning), so a reworded server message never shows English to a patient.
 */
export function buddyErrorKey(status: number | undefined, detail: string | undefined): BuddyErrorKey {
  const d = (detail ?? '').toLowerCase();
  if (d.includes('enough cheers')) return 'cheerCap';
  if (d.includes('reminder today')) return 'nudgeCap';
  if (d.includes('asked recently')) return 'askCap';
  if (d.includes('too quickly')) return 'textRate';
  if (d.includes('does not fit')) return 'notNow';
  if (d.includes('links are not allowed')) return 'link';
  if (d.includes('characters')) return 'tooLong';
  if (d.includes('already sent')) return 'alreadySent';
  if (d.includes('no active buddy') || d.includes('has ended')) return 'ended';
  if (status === 429) return 'cheerCap';
  if (status === 409) return 'ended';
  return 'failed';
}

// ---- Names in Slovenian cases. The server stores no grammatical gender, so only the regular -a/-o endings are
// declined (Marija → Mariji, Luka → Luki, Marko → Marku); anything else falls back to wording without the name.
// To confirm in the native-speaker review.

/** "Mariji", "Marku", or null when unsure. */
export function dative(name: string): string | null {
  if (/^\p{Lu}\p{Ll}+a$/u.test(name)) return `${name.slice(0, -1)}i`;
  if (/^\p{Lu}\p{Ll}+o$/u.test(name)) return `${name.slice(0, -1)}u`;
  return null;
}

/** "z Marijo", "s Katjo", "z Markom", or null when unsure. "s" before a voiceless consonant. */
export function withInstrumental(name: string): string | null {
  let form: string | null = null;
  if (/^\p{Lu}\p{Ll}+a$/u.test(name)) form = `${name.slice(0, -1)}o`;
  else if (/^\p{Lu}\p{Ll}+o$/u.test(name)) form = `${name.slice(0, -1)}om`;
  if (!form) return null;
  const prep = /^[cčfhkpsštCČFHKPSŠT]/.test(form) ? 's' : 'z';
  return `${prep} ${form}`;
}

/** First letter for the avatar. */
export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '·';
}

/** Every line the screens render from the buddy's facts. Kept in one place so a test can prove none leaks `missedDays`. */
export function buddyLines(state: BuddyState, myDone: boolean, now: Date = new Date()) {
  const b = state.buddy;
  if (!b) return { header: null, pair: null, nudge: null, home: state.status === 'ended' ? sl.buddy.home.ended : null };
  const header = b.finished ? sl.buddy.finished : showStreak(b.streak) ? `${sl.buddy.day(b.dayNumber)} · ${sl.buddy.streak(b.streak)}` : sl.buddy.day(b.dayNumber);
  const line = pairLine(myDone, b.checkedInToday);
  const pair = line === 'buddyOnly' ? sl.buddy.pair.buddyOnly(b.firstName) : sl.buddy.pair[line];
  const nudge = showNudgeCard({ state, now }) ? sl.buddy.nudge.text(b.firstName) : null;
  const home =
    state.status === 'ended'
      ? sl.buddy.home.ended
      : myDone && b.checkedInToday
        ? sl.buddy.home.both
        : b.checkedInToday
          ? sl.buddy.home.buddyDone
          : sl.buddy.day(b.dayNumber);
  return { header, pair, nudge, home };
}
