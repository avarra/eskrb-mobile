// The Api implementation on the eSkrb backend. Server DTOs are parsed here and mapped to the contract in `api.ts`.
import { inArray } from 'drizzle-orm';
import { z } from 'zod';

import {
  answers,
  episode as episodeSchema,
  MAX_LOG_PHOTOS,
  flag,
  me as meSchema,
  patientAction,
  protocol as protocolSchema,
  type Api,
  type CheckIn,
  type Log,
  type Message,
  type MyEpisode,
  type SubmitResult,
  type TimelineItem,
} from '@/data/api';
import { db } from '@/data/db/client';
import { messageReads } from '@/data/db/schema';
import { ApiError, request } from '@/data/http';
import { deleteTempPhoto, photoPart } from '@/data/photos';
import { nowIso } from '@/domain/day';

/** Server timestamps are UTC; add the `Z` if the server left it off so JS doesn't read them as local time. */
const utc = z.string().transform((s) => (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`));

const episodeDto = z.object({
  id: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  dayNumber: z.coerce.number().int(),
  checkInDoneToday: z.boolean(),
  protocol: protocolSchema,
});

const checkInResultDto = z.object({
  id: z.string(),
  date: z.string(),
  answers,
  flags: z.array(flag),
  patientAction,
});

const logDto = z.object({
  id: z.string(),
  type: z.enum(['text', 'photo']),
  source: z.enum(['typed', 'dictated']).nullable(),
  text: z.string().nullable(),
  mediaUrl: z.string().nullable(),
  createdAt: utc,
});

const logResultDto = z.object({
  log: logDto,
  /** Every log the request created (one per photo); `log` is the first. */
  logs: z.array(logDto),
  flags: z.array(flag),
  patientAction,
});

const messageDto = z.object({
  id: z.string(),
  fromName: z.string(),
  fromRole: z.string(),
  body: z.string(),
  createdAt: utc,
});

const timelineDto = z.array(
  z.object({
    kind: z.string(),
    id: z.string(),
    at: utc,
    reviewed: z.boolean().nullish(),
    answers: answers.nullish(),
    logType: z.string().nullish(),
    source: z.string().nullish(),
    text: z.string().nullish(),
    mediaUrl: z.string().nullish(),
    fromName: z.string().nullish(),
    fromRole: z.string().nullish(),
    body: z.string().nullish(),
  }),
);

const severityRank = { none: 0, contact_team: 1, call_112: 2 } as const;

async function readTimes(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await db.select().from(messageReads).where(inArray(messageReads.messageId, ids));
  return new Map(rows.map((r) => [r.messageId, r.readAt]));
}

export const remoteApi: Api = {
  async getMe(token) {
    return meSchema.parse(await request('/me', { token }));
  },

  async getMyEpisode(): Promise<MyEpisode | null> {
    let raw: unknown;
    try {
      raw = await request('/me/episode');
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
    const parsed = episodeDto.safeParse(raw);
    if (!parsed.success) {
      // Surfaces as the offline screen; log why so a contract mismatch isn't mistaken for a network problem.
      console.error('[api] /me/episode did not match the contract', parsed.error.issues);
      throw parsed.error;
    }
    const dto = parsed.data;
    return {
      episode: episodeSchema.parse(dto),
      protocol: dto.protocol,
      dayNumber: Math.min(dto.protocol.durationDays, Math.max(1, dto.dayNumber)),
      todayCheckInDone: dto.checkInDoneToday,
    };
  },

  async postCheckIn(episodeId, { answers: a, photos }): Promise<SubmitResult<CheckIn>> {
    const photoEntries = Object.entries(photos);
    let body: unknown = { answers: a };
    if (photoEntries.length) {
      // Photo answers go as file parts named by the question id; the rest as a JSON text field.
      const form = new FormData();
      form.append('answers', JSON.stringify(a));
      for (const [questionId, uri] of photoEntries) form.append(questionId, photoPart(uri));
      body = form;
    }
    const dto = checkInResultDto.parse(await request(`/episodes/${episodeId}/checkins`, { method: 'POST', body }));
    photoEntries.forEach(([, uri]) => deleteTempPhoto(uri));
    return {
      item: { id: dto.id, date: dto.date, answers: dto.answers, createdAt: nowIso(), reviewed: false },
      flags: dto.flags,
      patientAction: dto.patientAction,
    };
  },

  async postLog(episodeId, input): Promise<SubmitResult<Log>> {
    const text = input.text?.trim() || null;
    const results: z.infer<typeof logResultDto>[] = [];

    if (input.photoUris.length > MAX_LOG_PHOTOS) throw new Error(`At most ${MAX_LOG_PHOTOS} photos per note`);
    // Photos first: a rejected file (wrong format, too big) is the likelier failure, and then the text isn't saved twice on retry.
    if (input.photoUris.length) {
      // One all-or-nothing request; each file becomes its own photo log.
      const form = new FormData();
      for (const uri of input.photoUris) form.append('file', photoPart(uri));
      results.push(logResultDto.parse(await request(`/episodes/${episodeId}/logs`, { method: 'POST', body: form })));
      input.photoUris.forEach(deleteTempPhoto);
    }
    if (text) {
      const body = { type: 'text', source: input.source ?? 'typed', text };
      // The text log leads, so it goes to the front.
      results.unshift(logResultDto.parse(await request(`/episodes/${episodeId}/logs`, { method: 'POST', body })));
    }

    const first = results[0];
    if (!first) throw new Error('Empty note');
    const action = results.map((r) => r.patientAction).reduce((a, b) => (severityRank[b] > severityRank[a] ? b : a), 'none' as const);
    return {
      item: { ...first.log, reviewed: false },
      flags: results.flatMap((r) => r.flags),
      patientAction: action,
    };
  },

  async getTimeline(episodeId) {
    const rows = timelineDto.parse(await request(`/episodes/${episodeId}/timeline?limit=200`));
    const reads = await readTimes(rows.filter((r) => r.kind === 'message').map((r) => r.id));
    const items: TimelineItem[] = [];
    for (const r of rows) {
      if (r.kind === 'checkin') {
        items.push({
          kind: 'checkin',
          at: r.at,
          checkIn: { id: r.id, date: null, answers: r.answers ?? {}, createdAt: r.at, reviewed: !!r.reviewed },
        });
      } else if (r.kind === 'log') {
        const source = r.source === 'typed' || r.source === 'dictated' ? r.source : null;
        items.push({
          kind: 'log',
          at: r.at,
          log: {
            id: r.id,
            type: r.logType === 'photo' ? 'photo' : 'text',
            source,
            text: r.text ?? null,
            mediaUrl: r.mediaUrl ?? null,
            createdAt: r.at,
            reviewed: !!r.reviewed,
          },
        });
      } else if (r.kind === 'message') {
        const message: Message = {
          id: r.id,
          fromName: r.fromName ?? '',
          fromRole: r.fromRole ?? 'staff',
          body: r.body ?? '',
          createdAt: r.at,
          // Own messages are read by definition.
          readAt: r.fromRole === 'patient' ? r.at : (reads.get(r.id) ?? null),
        };
        items.push({ kind: 'message', at: r.at, message });
      }
    }
    // Newest first, as the server sends it; sort again in case.
    items.sort((a, b) => b.at.localeCompare(a.at));
    return { items };
  },

  async postMessage(episodeId, body): Promise<Message> {
    const dto = messageDto.parse(await request(`/episodes/${episodeId}/messages`, { method: 'POST', body: { body: body.trim() } }));
    return { ...dto, readAt: dto.createdAt };
  },

  async markMessageRead(messageId) {
    await db.insert(messageReads).values({ messageId, readAt: nowIso() }).onConflictDoNothing();
  },
};
