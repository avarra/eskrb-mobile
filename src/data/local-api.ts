// The only Api implementation for now: everything lives in SQLite on the phone.
import { and, desc, eq, isNull } from 'drizzle-orm';

import {
  checkIn as checkInSchema,
  episode as episodeSchema,
  flag as flagSchema,
  log as logSchema,
  message as messageSchema,
  type Answers,
  type Api,
  type CheckIn,
  type Flag,
  type Log,
  type Message,
  type MyEpisode,
  type NewLog,
  type Protocol,
  type SubmitResult,
  type TimelineItem,
} from '@/data/api';
import { db } from '@/data/db/client';
import { checkIns, episodes, flags, logs, messages, settings } from '@/data/db/schema';
import { seedHistory } from '@/data/db/seed';
import { deleteAllPhotos, savePhoto } from '@/data/photos';
import { kneeReplacement, protocols } from '@/data/protocol';
import { PATIENT_ID, STAFF } from '@/config';
import { extractLocal } from '@/domain/extract-local';
import { dayNumber, isoDay, nowIso, shiftDay, uid } from '@/domain/day';
import { evaluate } from '@/domain/rules';

function protocolFor(id: string): Protocol {
  const p = protocols[id];
  if (!p) throw new Error(`Unknown protocol ${id}`);
  return p;
}

function answerLabel(value: unknown): string {
  if (typeof value === 'number') return String(value).replace('.', ',');
  return String(value);
}

async function insertFlags(
  episodeId: string,
  sourceType: Flag['sourceType'],
  sourceId: string,
  protocol: Protocol,
  answers: Answers,
  quoteFor: (field: string) => string,
): Promise<{ flags: Flag[]; patientAction: SubmitResult<unknown>['patientAction'] }> {
  const { hits, patientAction } = evaluate(protocol.rules, answers);
  const createdAt = nowIso();
  const rows = hits.map((h) => ({
    id: uid(),
    episodeId,
    sourceType,
    sourceId,
    ruleId: h.ruleId,
    severity: h.severity,
    quote: quoteFor(h.field),
    createdAt,
    resolvedAt: null,
  }));
  if (rows.length) await db.insert(flags).values(rows);
  return { flags: rows.map((r) => flagSchema.parse(r)), patientAction };
}

export const localApi: Api = {
  async getMyEpisode(): Promise<MyEpisode | null> {
    const row = await db.query.episodes.findFirst({ orderBy: desc(episodes.createdAt) });
    if (!row) return null;
    const episode = episodeSchema.parse(row);
    const protocol = protocolFor(episode.protocolId);
    const today = isoDay();
    const done = await db.query.checkIns.findFirst({
      where: and(eq(checkIns.episodeId, episode.id), eq(checkIns.date, today)),
    });
    return {
      episode,
      protocol,
      dayNumber: dayNumber(episode.startDate, protocol.durationDays),
      todayCheckInDone: !!done,
    };
  },

  async postCheckIn(episodeId, answers): Promise<SubmitResult<CheckIn>> {
    const ep = await db.query.episodes.findFirst({ where: eq(episodes.id, episodeId) });
    if (!ep) throw new Error('No episode');
    const protocol = protocolFor(ep.protocolId);
    const row = {
      id: uid(),
      episodeId,
      date: isoDay(),
      answers,
      authoredBy: PATIENT_ID,
      createdAt: nowIso(),
      reviewedAt: null,
      reviewedBy: null,
    };
    const item = checkInSchema.parse(row);
    await db.insert(checkIns).values(row);
    const questionText = (field: string) => protocol.questions.find((q) => q.id === field)?.text ?? field;
    const { flags: saved, patientAction } = await insertFlags(episodeId, 'checkin', row.id, protocol, answers, (field) =>
      `${questionText(field)} ${answerLabel(answers[field])}`,
    );
    return { item, flags: saved, patientAction };
  },

  async postLog(episodeId, input: NewLog): Promise<SubmitResult<Log>> {
    const ep = await db.query.episodes.findFirst({ where: eq(episodes.id, episodeId) });
    if (!ep) throw new Error('No episode');
    const protocol = protocolFor(ep.protocolId);
    const text = input.text?.trim() || null;
    const { extracted, quotes } = text ? extractLocal(text) : { extracted: {}, quotes: {} as Record<string, string> };
    const mediaUrl = input.photoUri ? await savePhoto(input.photoUri) : null;
    const row = {
      id: uid(),
      episodeId,
      type: mediaUrl ? ('photo' as const) : ('text' as const),
      source: text ? input.source : null,
      text,
      mediaUrl,
      extracted,
      authoredBy: PATIENT_ID,
      createdAt: nowIso(),
      reviewedAt: null,
    };
    const item = logSchema.parse(row);
    await db.insert(logs).values(row);
    const { flags: saved, patientAction } = await insertFlags(episodeId, 'log', row.id, protocol, extracted, (field) => quotes[field] ?? text ?? '');
    return { item, flags: saved, patientAction };
  },

  async getTimeline(episodeId) {
    const [c, l, m] = await Promise.all([
      db.query.checkIns.findMany({ where: eq(checkIns.episodeId, episodeId) }),
      db.query.logs.findMany({ where: eq(logs.episodeId, episodeId) }),
      db.query.messages.findMany({ where: eq(messages.episodeId, episodeId) }),
    ]);
    const items: TimelineItem[] = [
      ...c.map((r) => ({ kind: 'checkin' as const, at: r.createdAt, checkIn: checkInSchema.parse(r) })),
      ...l.map((r) => ({ kind: 'log' as const, at: r.createdAt, log: logSchema.parse(r) })),
      ...m.map((r) => ({ kind: 'message' as const, at: r.createdAt, message: messageSchema.parse(r) })),
    ];
    items.sort((a, b) => b.at.localeCompare(a.at));
    return { items };
  },

  async postMessage(episodeId, body): Promise<Message> {
    const row = {
      id: uid(),
      episodeId,
      fromUserId: PATIENT_ID,
      fromName: '',
      body: body.trim(),
      createdAt: nowIso(),
      readAt: nowIso(),
      refType: null,
      refId: null,
    };
    const item = messageSchema.parse(row);
    await db.insert(messages).values(row);
    return item;
  },

  async markMessageRead(messageId) {
    await db.update(messages).set({ readAt: nowIso() }).where(and(eq(messages.id, messageId), isNull(messages.readAt)));
  },
};

// ---------------------------------------------------------------------------------------------
// Device-only operations: first-run setup, settings and the hidden debug screen. Not part of the
// REST contract, so swapping the Api implementation leaves these alone.

export const localDevice = {
  async createEpisode({ patientName, startDate }: { patientName: string; startDate: string }) {
    const protocol = kneeReplacement;
    const id = uid();
    await db.insert(episodes).values({
      id,
      patientId: PATIENT_ID,
      patientName,
      protocolId: protocol.id,
      startDate,
      endDate: shiftDay(startDate, protocol.durationDays),
      createdAt: nowIso(),
    });
    await seedHistory(id);
    return id;
  },

  async getSetting(key: string): Promise<string | null> {
    const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
    return row?.value ?? null;
  },

  async setSetting(key: string, value: string) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  },

  async addFakeReply(episodeId: string) {
    const latestLog = await db.query.logs.findFirst({ where: eq(logs.episodeId, episodeId), orderBy: desc(logs.createdAt) });
    await db.insert(messages).values({
      id: uid(),
      episodeId,
      fromUserId: STAFF.id,
      fromName: STAFF.name,
      body: 'Hvala za zapis. Pogledali smo ga, vse je v redu. Če se kaj spremeni, nam pišite.',
      createdAt: nowIso(),
      readAt: null,
      refType: latestLog ? 'log' : null,
      refId: latestLog?.id ?? null,
    });
  },

  async markAllReviewed(episodeId: string) {
    const at = nowIso();
    await db.update(checkIns).set({ reviewedAt: at, reviewedBy: STAFF.id }).where(and(eq(checkIns.episodeId, episodeId), isNull(checkIns.reviewedAt)));
    await db.update(logs).set({ reviewedAt: at }).where(and(eq(logs.episodeId, episodeId), isNull(logs.reviewedAt)));
    await db.update(flags).set({ resolvedAt: at }).where(and(eq(flags.episodeId, episodeId), isNull(flags.resolvedAt)));
  },

  /** Move the surgery date so today becomes day `day`. */
  async setDayNumber(episodeId: string, day: number) {
    const startDate = shiftDay(isoDay(), -day);
    await db.update(episodes).set({ startDate, endDate: shiftDay(startDate, kneeReplacement.durationDays) }).where(eq(episodes.id, episodeId));
  },

  async resetAll() {
    await db.delete(flags);
    await db.delete(messages);
    await db.delete(logs);
    await db.delete(checkIns);
    await db.delete(episodes);
    await db.delete(settings);
    deleteAllPhotos();
  },
};
