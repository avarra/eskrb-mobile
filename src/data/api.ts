// The REST contract of the eSkrb backend (https://eskrb-api.home.sync.si/openapi/v1.json), as the screens see it.
// Screens import ONLY from here (types) and `@/data/queries` (hooks). `@/data/remote-api` maps server DTOs to these.
import { z } from 'zod';

export const answerValue = z.union([z.number(), z.string(), z.boolean()]);
export type AnswerValue = z.infer<typeof answerValue>;
export const answers = z.record(z.string(), answerValue);
export type Answers = z.infer<typeof answers>;

const questionBase = { id: z.string(), text: z.string() };
const questionUnion = z.discriminatedUnion('type', [
  z.object({ ...questionBase, type: z.literal('scale'), min: z.number(), max: z.number() }),
  z.object({ ...questionBase, type: z.literal('number'), unit: z.string() }),
  z.object({ ...questionBase, type: z.literal('choice'), options: z.array(z.string()).min(1) }),
  z.object({ ...questionBase, type: z.literal('boolean') }),
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

export const protocol = z.object({
  id: z.string(),
  name: z.string().optional(),
  durationDays: z.number().int().positive(),
  questions: z.array(question),
  rules: z.array(rule),
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
  /** Kept on the phone: when the patient opened it. The server has no read state yet. */
  readAt: isoDateTime.nullable(),
});
export type Message = z.infer<typeof message>;

export const me = z.object({ id: z.string(), name: z.string(), role });
export type Me = z.infer<typeof me>;

export type MyEpisode = {
  episode: Episode;
  protocol: Protocol;
  dayNumber: number;
  todayCheckInDone: boolean;
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
  /** Local file URI of a photo the patient took or picked. */
  photoUri: string | null;
};

/** Mirrors the REST endpoints the patient app uses. Swap the implementation, not the screens. */
export interface Api {
  /** GET /me — also how a token is validated at sign-in. */
  getMe(token?: string): Promise<Me>;
  /** GET /me/episode — null when the patient has no active episode (404). */
  getMyEpisode(): Promise<MyEpisode | null>;
  /** POST /episodes/:id/checkins */
  postCheckIn(episodeId: string, answers: Answers): Promise<SubmitResult<CheckIn>>;
  /** POST /episodes/:id/logs — text (JSON) and photo (multipart) are separate requests on the server. */
  postLog(episodeId: string, input: NewLog): Promise<SubmitResult<Log>>;
  /** GET /episodes/:id/timeline — newest first. */
  getTimeline(episodeId: string): Promise<Timeline>;
  /** POST /episodes/:id/messages */
  postMessage(episodeId: string, body: string): Promise<Message>;
  /** Stored on the phone until the server tracks read state. */
  markMessageRead(messageId: string): Promise<void>;
}
