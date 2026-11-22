import { describe, expect, it } from 'vitest';

import { buddyState, type BuddyMessage, type BuddyState, type Cheer } from '../data/api';
import {
  buddyErrorKey,
  buddyLines,
  dative,
  mergeMessages,
  pickCheers,
  showNudgeCard,
  todayDots,
  validateBuddyText,
  withInstrumental,
} from './buddy';

// The catalogue as the backend seeds it (api/Rules/Buddy.cs).
const catalogue: Cheer[] = [
  ['remind', 'not_checked_in', true],
  ['ask', 'missed_days', true],
  ['congrats-checkin', 'checked_in', false],
  ['both-done', 'both_checked_in', false],
  ['streak-3', 'streak_3', false],
  ['streak-7', 'streak_7', false],
  ['day-7', 'day_7', false],
  ['welcome-back', 'returned', false],
  ['congrats-finish', 'finished', false],
  ['fingers-crossed', 'always', false],
  ['until-tomorrow', 'always', false],
].map(([id, moment, nudge]) => ({ id: id as string, moment: moment as string, label: `L ${id}`, text: `T ${id}`, starter: null, nudge: nudge as boolean }));

function state(over: Partial<Omit<BuddyState, 'buddy'>> & { buddy?: Partial<NonNullable<BuddyState['buddy']>> | null } = {}): BuddyState {
  const { buddy, ...rest } = over;
  return {
    status: 'active',
    unread: 0,
    moments: [],
    cheers: catalogue,
    ...rest,
    buddy:
      buddy === null
        ? null
        : { firstName: 'Marija', dayNumber: 6, checkedInToday: true, streak: 3, missedDays: 0, finished: false, ...buddy },
  };
}

const at = (h: number) => new Date(2026, 10, 21, h, 0);
const ids = (cs: Cheer[]) => cs.map((c) => c.id);

describe('pickCheers', () => {
  it('puts moment cheers first (milestone before checked_in), then evergreen, max 4', () => {
    const s = state({ moments: ['checked_in', 'streak_3'] });
    expect(ids(pickCheers({ state: s, myCheckInDone: false, now: at(16) }))).toEqual(['streak-3', 'congrats-checkin', 'fingers-crossed', 'until-tomorrow']);
  });

  it('adds both_checked_in only when both checked in today', () => {
    const s = state({ moments: ['checked_in'] });
    expect(ids(pickCheers({ state: s, myCheckInDone: true, now: at(10) }))).toContain('both-done');
    expect(ids(pickCheers({ state: s, myCheckInDone: false, now: at(10) }))).not.toContain('both-done');
    const notIn = state({ moments: ['not_checked_in'], buddy: { checkedInToday: false } });
    expect(ids(pickCheers({ state: notIn, myCheckInDone: true, now: at(10) }))).not.toContain('both-done');
  });

  it('holds the reminder back until 17:00, nudges first after that', () => {
    const s = state({ moments: ['not_checked_in', 'missed_days'], buddy: { checkedInToday: false, streak: 0, missedDays: 3 } });
    expect(ids(pickCheers({ state: s, myCheckInDone: false, now: at(16) }))).toEqual(['ask', 'fingers-crossed', 'until-tomorrow']);
    expect(ids(pickCheers({ state: s, myCheckInDone: false, now: at(17) }))).toEqual(['remind', 'ask', 'fingers-crossed', 'until-tomorrow']);
  });

  it('offers only the finished cheer for a finished buddy, nothing for a pair a person ended', () => {
    const finished = state({ status: 'ended', moments: ['finished'], buddy: { finished: true }, cheers: catalogue.filter((c) => c.id === 'congrats-finish') });
    expect(ids(pickCheers({ state: finished, myCheckInDone: true, now: at(12) }))).toEqual(['congrats-finish']);
    expect(ids(pickCheers({ state: state({ status: 'ended', buddy: null }), myCheckInDone: true, now: at(12) }))).toEqual([]);
    // Even if a server sent the whole catalogue for a finished buddy.
    expect(ids(pickCheers({ state: state({ buddy: { finished: true }, moments: ['checked_in'] }), myCheckInDone: true, now: at(12) }))).toEqual(['congrats-finish']);
  });

  it('never offers a cheer whose moment this app does not know', () => {
    const s = state({ moments: ['checked_in'], cheers: [...catalogue, { id: 'x', moment: 'birthday', label: 'x', text: 'x', starter: null, nudge: false }] });
    expect(ids(pickCheers({ state: s, myCheckInDone: false, now: at(12) }))).not.toContain('x');
  });
});

describe('showNudgeCard', () => {
  const absent = state({ moments: ['not_checked_in'], buddy: { checkedInToday: false } });
  it('shows after the nudge hour for an active pair whose buddy has not checked in', () => {
    expect(showNudgeCard({ state: absent, now: at(18) })).toBe(true);
    expect(showNudgeCard({ state: absent, now: at(16) })).toBe(false);
  });
  it('hides when the server left the moment out (daily cap), the buddy checked in, finished or the pair ended', () => {
    expect(showNudgeCard({ state: { ...absent, moments: [] }, now: at(18) })).toBe(false);
    expect(showNudgeCard({ state: state({ moments: ['not_checked_in'] }), now: at(18) })).toBe(false);
    expect(showNudgeCard({ state: state({ moments: ['not_checked_in'], buddy: { checkedInToday: false, finished: true } }), now: at(18) })).toBe(false);
    expect(showNudgeCard({ state: { ...absent, status: 'ended' }, now: at(18) })).toBe(false);
  });
});

describe('validateBuddyText', () => {
  it('mirrors the server rules', () => {
    expect(validateBuddyText('  ')).toBe('empty');
    expect(validateBuddyText('Dober dan')).toBe('ok');
    expect(validateBuddyText('x'.repeat(300))).toBe('ok');
    expect(validateBuddyText('x'.repeat(301))).toBe('tooLong');
    expect(validateBuddyText('Poglejte www.example.si')).toBe('link');
    expect(validateBuddyText('HTTPS://x')).toBe('link');
  });
});

describe('todayDots', () => {
  it('is open until the check-in is sent', () => {
    expect(todayDots(true, false)).toEqual({ me: 'done', buddy: 'open' });
    expect(todayDots(false, true)).toEqual({ me: 'open', buddy: 'done' });
  });
});

describe('the sender never sees missed days', () => {
  it('renders no line with the missedDays number', () => {
    for (const checkedInToday of [true, false]) {
      for (const myDone of [true, false]) {
        for (const h of [9, 18]) {
          const s = state({ moments: ['not_checked_in', 'missed_days'], buddy: { checkedInToday, missedDays: 97, streak: 0, dayNumber: 6 } });
          const lines = Object.values(buddyLines(s, myDone, at(h))).filter((l): l is string => !!l);
          expect(lines.length).toBeGreaterThan(0);
          for (const l of lines) expect(l).not.toContain('97');
        }
      }
    }
  });

  it('shows the streak only from 2 on, with the dual for 2', () => {
    expect(buddyLines(state({ buddy: { streak: 1 } }), true).header).toBe('Dan 6');
    expect(buddyLines(state({ buddy: { streak: 2 } }), true).header).toBe('Dan 6 · 2 dneva zapored');
    expect(buddyLines(state({ buddy: { streak: 3 } }), true).header).toBe('Dan 6 · 3 dni zapored');
  });
});

describe('mergeMessages', () => {
  const m = (id: string, createdAt: string): BuddyMessage => ({ id, fromMe: false, kind: 'text', text: id, source: 'typed', createdAt });
  it('adds newer messages, replaces re-fetched ones and keeps time order', () => {
    const a = m('a', '2026-11-21T10:00:00.123456Z');
    const b = m('b', '2026-11-21T11:00:00Z');
    const merged = mergeMessages([b], [a, { ...b, text: 'edited' }]);
    expect(merged.map((x) => x.id)).toEqual(['a', 'b']);
    expect(merged[1]?.text).toBe('edited');
  });
});

describe('buddyErrorKey', () => {
  it('maps the server details to copy keys', () => {
    expect(buddyErrorKey(429, 'You have sent enough cheers for today.')).toBe('cheerCap');
    expect(buddyErrorKey(429, 'You already sent a reminder today.')).toBe('nudgeCap');
    expect(buddyErrorKey(429, 'You already asked recently.')).toBe('askCap');
    expect(buddyErrorKey(429, 'You are sending messages too quickly. Try again in a while.')).toBe('textRate');
    expect(buddyErrorKey(409, 'That cheer does not fit right now.')).toBe('notNow');
    expect(buddyErrorKey(409, 'This buddy connection has ended.')).toBe('ended');
    expect(buddyErrorKey(409, 'You already sent this.')).toBe('alreadySent');
    expect(buddyErrorKey(400, 'Links are not allowed in buddy messages.')).toBe('link');
    expect(buddyErrorKey(429, 'Nekaj novega')).toBe('cheerCap');
    expect(buddyErrorKey(undefined, undefined)).toBe('failed');
  });
});

describe('names', () => {
  it('declines regular names and gives up on the rest', () => {
    expect(dative('Marija')).toBe('Mariji');
    expect(dative('Luka')).toBe('Luki');
    expect(dative('Marko')).toBe('Marku');
    expect(dative('Peter')).toBeNull();
    expect(withInstrumental('Marija')).toBe('z Marijo');
    expect(withInstrumental('Katja')).toBe('s Katjo');
    expect(withInstrumental('Nina')).toBe('z Nino');
    expect(withInstrumental('Ivan')).toBeNull();
  });
});

describe('buddyState schema', () => {
  it('parses the backend answer for a finished buddy', () => {
    const s = buddyState.parse({
      status: 'ended',
      buddy: { firstName: 'Nina', dayNumber: 43, checkedInToday: false, streak: 0, missedDays: 3, finished: true },
      unread: 0,
      moments: ['finished'],
      cheers: [{ id: 'congrats-finish', moment: 'finished', label: 'Čestitajte', text: 'Čestitke.', starter: null, nudge: false }],
    });
    expect(ids(pickCheers({ state: s, myCheckInDone: false, now: at(12) }))).toEqual(['congrats-finish']);
  });
});
