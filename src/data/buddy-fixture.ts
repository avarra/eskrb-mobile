// Dev-only stand-in for the buddy endpoints, for walking through the screens without a second patient.
// Enable with EXPO_PUBLIC_BUDDY_FIXTURE=<scenario> (active | nudge | finished | ended | none). Never in a release build:
// `data/index.ts` only wraps the API when __DEV__ is true. Shapes follow the backend (BuddyController.cs).
// It also answers /me, /me/episode and the timeline with a demo patient (any code signs in), so the screens can be
// shown without a seeded token. Check-ins, notes and staff messages still go to the real API.
import type { Api, BuddyMessage, BuddyState, Cheer, MyEpisode } from '@/data/api';
import { ApiError } from '@/data/http';

export const BUDDY_SCENARIOS = ['active', 'nudge', 'finished', 'ended', 'none'] as const;
export type BuddyScenario = (typeof BUDDY_SCENARIOS)[number];

// The backend's catalogue (api/Rules/Buddy.cs) with the reworded copy from design/BUDDY.md, as the seed should be.
const catalogue: Cheer[] = (
  [
    ['remind', 'not_checked_in', 'Spomnite na pregled', 'Marija misli na vas. Ne pozabite na današnji pregled.', null, true],
    ['ask', 'missed_days', 'Vprašajte, kako gre', 'Marija misli na vas. Kako vam gre?', 'Kako vam gre?', true],
    ['congrats-checkin', 'checked_in', 'Čestitajte za pregled', 'Bravo za današnji pregled.', null, false],
    ['both-done', 'both_checked_in', 'Oba pregleda sta oddana', 'Oba pregleda sta danes oddana.', null, false],
    ['streak-3', 'streak_3', 'Čestitajte za 3 dni zapored', '3 dni zapored, bravo.', null, false],
    ['day-7', 'day_7', 'Že teden dni za nama', 'Teden dni okrevanja je za vama.', null, false],
    ['welcome-back', 'returned', 'Pozdravite ob vrnitvi', 'Lepo, da ste spet tu.', null, false],
    ['congrats-finish', 'finished', 'Čestitajte', 'Čestitke za zaključeno okrevanje.', null, false],
    ['fingers-crossed', 'always', 'Držim pesti', 'Držim pesti.', null, false],
    ['until-tomorrow', 'always', 'Do jutri', 'Do jutri.', null, false],
  ] as const
).map(([id, moment, label, text, starter, nudge]) => ({ id, moment, label, text, starter, nudge }));

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

function seed(scenario: BuddyScenario): { state: BuddyState; messages: BuddyMessage[] } {
  const marija = { firstName: 'Marija', dayNumber: 6, checkedInToday: true, streak: 3, missedDays: 0, finished: false };
  const thread: BuddyMessage[] = [
    { id: 'm1', fromMe: false, kind: 'text', text: 'Danes sem prvič šla po stopnicah brez ograje. Počasi, a gre.', source: 'typed', createdAt: ago(60 * 22) },
    { id: 'm2', fromMe: true, kind: 'text', text: 'Lepo. Jaz še vedno z berglami, ampak koleno manj peče.', source: 'dictated', createdAt: ago(60 * 21) },
    { id: 'm3', fromMe: false, kind: 'cheer', text: 'Bravo za današnji pregled.', source: null, createdAt: ago(16) },
  ];
  switch (scenario) {
    case 'active':
      return { state: { status: 'active', buddy: marija, unread: 1, moments: ['checked_in', 'streak_3'], cheers: catalogue }, messages: thread };
    case 'nudge':
      return {
        state: {
          status: 'active',
          buddy: { ...marija, checkedInToday: false, streak: 0, missedDays: 1 },
          unread: 0,
          moments: ['not_checked_in'],
          cheers: catalogue,
        },
        messages: [
          { id: 'n1', fromMe: false, kind: 'text', text: 'Hvala za pozdrav. Danes je bil težek dan.', source: 'typed', createdAt: ago(60 * 24 * 2) },
          { id: 'n2', fromMe: true, kind: 'cheer', text: 'Držim pesti.', source: null, createdAt: ago(60 * 24 * 2 - 5) },
        ],
      };
    case 'finished':
      return {
        state: {
          status: 'ended',
          buddy: { ...marija, dayNumber: 43, checkedInToday: false, streak: 0, finished: true },
          unread: 0,
          moments: ['finished'],
          cheers: catalogue.filter((c) => c.id === 'congrats-finish'),
        },
        messages: [
          { id: 'f1', fromMe: false, kind: 'text', text: 'Jutri imam zadnji pregled pri zdravniku. Hvala za vse pozdrave.', source: 'typed', createdAt: ago(60 * 26) },
          { id: 'f2', fromMe: true, kind: 'cheer', text: 'Držim pesti.', source: null, createdAt: ago(60 * 25) },
        ],
      };
    case 'ended':
      return { state: { status: 'ended', buddy: null, unread: 0, moments: [], cheers: [] }, messages: [] };
    case 'none':
      return { state: { status: 'none', buddy: null, unread: 0, moments: [], cheers: [] }, messages: [] };
  }
}

const today = new Date();
const isoDay = (offset: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset).toISOString().slice(0, 10);
const demoEpisode: MyEpisode = {
  episode: { id: 'demo-episode', startDate: isoDay(-3), endDate: isoDay(38) },
  protocol: { id: 'knee-replacement', name: 'Knee replacement', durationDays: 42, questions: [], rules: [] },
  dayNumber: 4,
  todayCheckInDone: true,
  unreadMessages: 0,
  notes: [],
};

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

/** Wraps an Api so the buddy calls answer from memory, with the server's caps and error details. */
export function withBuddyFixture(base: Api, scenario: BuddyScenario): Api {
  let { state, messages } = seed(scenario);
  let n = 0;
  const add = (m: Omit<BuddyMessage, 'id' | 'createdAt'>) => {
    const msg = { ...m, id: `fx${++n}`, createdAt: new Date().toISOString() };
    messages = [...messages, msg];
    return msg;
  };
  const cheersToday = () => messages.filter((m) => m.fromMe && m.kind === 'cheer' && Date.now() - Date.parse(m.createdAt) < 12 * 3600_000);

  return {
    ...base,
    async getMe() {
      return { id: 'demo-patient', name: 'Ivanka Kos', role: 'patient' };
    },
    async getMyEpisode() {
      return demoEpisode;
    },
    async getTimeline() {
      return { items: [] };
    },
    async getBuddy() {
      await wait();
      return state;
    },
    async getBuddyMessages(after) {
      await wait();
      if (state.status === 'ended' && !state.buddy) return [];
      return after ? messages.filter((m) => Date.parse(m.createdAt) > Date.parse(after)) : messages;
    },
    async sendBuddyText(text, source) {
      await wait(400);
      if (state.status !== 'active') throw new ApiError(409, 'You have no active buddy.');
      if (/https?:|www\./i.test(text)) throw new ApiError(400, 'Links are not allowed in buddy messages.');
      return add({ fromMe: true, kind: 'text', text: text.trim(), source });
    },
    async sendCheer(cheerId) {
      await wait(600);
      const c = state.cheers.find((x) => x.id === cheerId);
      if (!c) throw new ApiError(400, 'Unknown cheerId.');
      if (cheersToday().length >= 3) throw new ApiError(429, 'You have sent enough cheers for today.');
      if (c.nudge && cheersToday().some((m) => catalogue.some((x) => x.nudge && x.text === m.text))) throw new ApiError(429, 'You already sent a reminder today.');
      const msg = add({ fromMe: true, kind: 'cheer', text: c.text, source: null });
      if (c.nudge) state = { ...state, moments: state.moments.filter((k) => k !== 'not_checked_in') };
      return msg;
    },
    async markBuddyRead() {
      await wait(100);
      state = { ...state, unread: 0 };
    },
    async reportBuddyMessage() {
      await wait(300);
    },
    async leaveBuddy() {
      await wait(400);
      state = { status: 'ended', buddy: null, unread: 0, moments: [], cheers: [] };
    },
  };
}
