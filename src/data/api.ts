// The REST contract of the eSkrb backend (https://eskrb-api.home.sync.si/openapi/v1.json), as the screens see it.
// Screens import ONLY from here (types) and `@/data/queries` (hooks). `@/data/remote-api` maps server DTOs to these.
import { z } from 'zod';

export const answerValue = z.union([z.number(), z.string(), z.boolean()]);
export type AnswerValue = z.infer<typeof answerValue>;
export const answers = z.record(z.string(), answerValue);
export type Answers = z.infer<typeof answers>;

/** The OpenAPI spec allows int32 fields as strings ("42"). */
const int = z.coerce.number().int();

const questionBase = { id: z.string(), text: z.string(), required: z.boolean().optional() };
const questionUnion = z.discriminatedUnion('type', [
  z.object({ ...questionBase, type: z.literal('scale'), min: int, max: int }),
  z.object({ ...questionBase, type: z.literal('number'), unit: z.string().default('') }),
  z.object({ ...questionBase, type: z.literal('choice'), options: z.array(z.string()).min(1) }),
  z.object({ ...questionBase, type: z.literal('boolean') }),
  /** Free text (non-blank, max 2000 chars); the server reads it to fill structured answers the patient left empty. */
  z.object({ ...questionBase, type: z.literal('text') }),
  /** Answered with a photo; sent as a multipart file part named by the question id. */
  z.object({ ...questionBase, type: z.literal('photo') }),
]);
/** The server sends every optional field, as null when unused (`min: null` on a choice). Drop the nulls first. */
export const question = z.preprocess(
  (v) => (v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null)) : v),
  questionUnion,
);
export type Question = z.infer<typeof question>;

export const severity = z.enum(['attention', 'urgent']);
export type Severity = z.infer<typeof severity>;

export const rule = z.object({
  id: z.string(),
  field: z.string(),
  op: z.enum(['>=', '>', '<=', '<', '==', '!=']),
  value: answerValue,
  severity,
});
export type Rule = z.infer<typeof rule>;

/**
 * Parses each item on its own and drops the ones this app version can't handle (a new question type, a new rule op),
 * so one unknown item doesn't fail the whole episode and show the patient the offline screen.
 */
function lenientArray<T extends z.ZodTypeAny>(item: T, label: string) {
  return z.array(z.unknown()).transform((items) =>
    items.flatMap((raw) => {
      const r = item.safeParse(raw);
      if (r.success) return [r.data as z.output<T>];
      if (__DEV__) console.warn(`[api] dropped ${label}`, JSON.stringify(raw), r.error.issues);
      return [];
    }),
  );
}

export const protocol = z.object({
  id: z.string(),
  name: z.string().optional(),
  durationDays: int.positive(),
  questions: lenientArray(question, 'question'),
  rules: lenientArray(rule, 'rule'),
});
export type Protocol = z.infer<typeof protocol>;

export const patientAction = z.enum(['none', 'contact_team', 'call_112']);
export type PatientAction = z.infer<typeof patientAction>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTime = z.string().min(10);

export const episode = z.object({
  id: z.string(),
  startDate: isoDate,
  endDate: isoDate,
});
export type Episode = z.infer<typeof episode>;

export const checkIn = z.object({
  id: z.string(),
  date: isoDate.nullable(),
  answers,
  createdAt: isoDateTime,
  /** Staff have looked at it. */
  reviewed: z.boolean(),
});
export type CheckIn = z.infer<typeof checkIn>;

export const logSource = z.enum(['typed', 'dictated']);
export type LogSource = z.infer<typeof logSource>;

export const log = z.object({
  id: z.string(),
  type: z.enum(['text', 'photo']),
  source: logSource.nullable(),
  text: z.string().nullable(),
  /** Server path (`/media/<id>`); it needs the bearer token, so render it through `mediaSource()`. */
  mediaUrl: z.string().nullable(),
  createdAt: isoDateTime,
  reviewed: z.boolean(),
});
export type Log = z.infer<typeof log>;

export const flag = z.object({
  id: z.string(),
  ruleId: z.string(),
  severity,
  quote: z.string(),
});
export type Flag = z.infer<typeof flag>;

export const role = z.enum(['patient', 'caretaker', 'staff', 'admin']);
export type Role = z.infer<typeof role>;

export const message = z.object({
  id: z.string(),
  fromName: z.string(),
  /** Anyone who is not the patient (or their caretaker) counts as the care team. */
  fromRole: z.string(),
  body: z.string(),
  createdAt: isoDateTime,
  /** Kept on the phone: when the patient opened it here. The server only knows "read up to" (see `unreadMessages`). */
  readAt: isoDateTime.nullable(),
});
export type Message = z.infer<typeof message>;

export const me = z.object({ id: z.string(), name: z.string(), role });
export type Me = z.infer<typeof me>;

/** Staff notes the patient may see (the server never sends `private` ones). Unknown kinds are dropped. */
export const noteKind = z.enum(['medication', 'advice']);
export type NoteKind = z.infer<typeof noteKind>;
export const careNote = z.object({
  id: z.string(),
  kind: noteKind,
  title: z.string().nullish().transform((v) => v || null),
  body: z.string(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type CareNote = z.infer<typeof careNote>;
export const careNotes = lenientArray(careNote, 'note');

export type MyEpisode = {
  episode: Episode;
  protocol: Protocol;
  dayNumber: number;
  todayCheckInDone: boolean;
  /** Care-team messages newer than the patient's last `POST /episodes/:id/read` (server-side read state). */
  unreadMessages: number;
  /** Medication instructions and advice from the care team, oldest first. */
  notes: CareNote[];
};

export type SubmitResult<T> = { item: T; flags: Flag[]; patientAction: PatientAction };

export type TimelineItem =
  | { kind: 'checkin'; at: string; checkIn: CheckIn }
  | { kind: 'log'; at: string; log: Log }
  | { kind: 'message'; at: string; message: Message };

export type Timeline = { items: TimelineItem[] };

export type NewLog = {
  text: string | null;
  source: LogSource | null;
  /** Local file URIs of photos the patient took or picked (at most `MAX_LOG_PHOTOS`). */
  photoUris: string[];
};

/** The server accepts at most this many photos per log request. */
export const MAX_LOG_PHOTOS = 5;

export type NewCheckIn = {
  /** Non-photo answers. */
  answers: Answers;
  /** Photo answers: question id → local file URI. */
  photos: Record<string, string>;
};

// ---- Recovery buddy ("kolega"), see PLAN-buddy.md and the backend's docs/buddy.md ----

/** The situations a cheer can fit. Unknown keys from a newer server are dropped, never thrown on. */
export const MOMENT_KEYS = [
  'not_checked_in',
  'missed_days',
  'checked_in',
  'both_checked_in',
  'streak_3',
  'streak_7',
  'streak_14',
  'streak_30',
  'day_7',
  'day_14',
  'day_21',
  'day_halfway',
  'returned',
  'finished',
  'always',
] as const;
export const momentKey = z.enum(MOMENT_KEYS);
export type MomentKey = z.infer<typeof momentKey>;

/** `moments` minus the keys this app version doesn't know. */
export const moments = z.array(z.unknown()).transform((items) => items.filter((k): k is MomentKey => momentKey.safeParse(k).success));

export const cheer = z.object({
  id: z.string(),
  /** When it fits; may be a moment this app doesn't know yet (then it is never offered). */
  moment: z.string(),
  /** What the sender taps. */
  label: z.string(),
  /** What the buddy receives. */
  text: z.string(),
  /** Text to pre-fill the composer with after sending (the "ask" cheer). */
  starter: z.string().nullish().transform((v) => v ?? null),
  /** A reminder-type cheer: one a day, offered first. */
  nudge: z.boolean().optional().default(false),
});
export type Cheer = z.infer<typeof cheer>;

/** What a buddy may know about the other patient: nothing else (no health data). */
export const buddyFacts = z.object({
  firstName: z.string(),
  dayNumber: int,
  checkedInToday: z.boolean(),
  streak: int,
  /** Only feeds which moments apply on the server. Never shown to the sender. */
  missedDays: int,
  finished: z.boolean(),
});
export type BuddyFacts = z.infer<typeof buddyFacts>;

export const buddyStatus = z.enum(['none', 'active', 'ended']);
export type BuddyStatus = z.infer<typeof buddyStatus>;

export const buddyState = z.object({
  status: buddyStatus,
  /** Null for `none`, and for `ended` when a person ended the pair (left or staff). */
  buddy: buddyFacts.nullable(),
  unread: int,
  moments,
  cheers: lenientArray(cheer, 'cheer'),
});
export type BuddyState = z.infer<typeof buddyState>;

export const buddyMessage = z.object({
  id: z.string(),
  fromMe: z.boolean(),
  kind: z.enum(['cheer', 'text']),
  text: z.string(),
  source: logSource.nullish().transform((v) => v ?? null),
  /** UTC instant as the server sent it (also the `after` cursor, so keep its full precision). */
  createdAt: isoDateTime,
});
export type BuddyMessage = z.infer<typeof buddyMessage>;

export const BUDDY_TEXT_MAX = 300;

/** Mirrors the REST endpoints the patient app uses. Swap the implementation, not the screens. */
export interface Api {
  /** GET /me — also how a token is validated at sign-in. */
  getMe(token?: string): Promise<Me>;
  /** GET /me/episode — null when the patient has no active episode (404). */
  getMyEpisode(): Promise<MyEpisode | null>;
  /** POST /episodes/:id/checkins — JSON, or multipart when the protocol has photo answers. */
  postCheckIn(episodeId: string, input: NewCheckIn): Promise<SubmitResult<CheckIn>>;
  /** POST /episodes/:id/logs — text (JSON) and photos (one multipart request, up to 5 files) are separate requests on the server. */
  postLog(episodeId: string, input: NewLog): Promise<SubmitResult<Log>>;
  /** GET /episodes/:id/timeline — newest first. */
  getTimeline(episodeId: string): Promise<Timeline>;
  /** POST /episodes/:id/messages */
  postMessage(episodeId: string, body: string): Promise<Message>;
  /** Stores the read time on the phone and POST /episodes/:id/read (the server marks everything so far as read). */
  markMessageRead(episodeId: string, messageId: string): Promise<void>;

  /** GET /me/buddy — the pair's status, the buddy's facts, unread count, moments and the cheer catalogue. */
  getBuddy(): Promise<BuddyState>;
  /** GET /me/buddy/messages?after=<ISO instant> — oldest first; only newer than `after` when given. */
  getBuddyMessages(after?: string): Promise<BuddyMessage[]>;
  /** POST /me/buddy/messages — free text, 1–300 characters, no links. */
  sendBuddyText(text: string, source: LogSource): Promise<BuddyMessage>;
  /** POST /me/buddy/cheers — one cheer from the server's catalogue. */
  sendCheer(cheerId: string): Promise<BuddyMessage>;
  /** POST /me/buddy/read — marks the buddy's messages read. */
  markBuddyRead(): Promise<void>;
  /** POST /me/buddy/messages/:id/report — flags a buddy message for the care team. */
  reportBuddyMessage(messageId: string): Promise<void>;
  /** DELETE /me/buddy — leaves the pair. */
  leaveBuddy(): Promise<void>;
}

/** POST /stt/temporary-key: a single-use Soniox key for one live transcription stream. Never log or cache it. */
export const sttKey = z.object({ apiKey: z.string().min(1), expiresAt: z.string() });
export type SttKey = z.infer<typeof sttKey>;
