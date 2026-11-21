// Believable history so testers don't start with an empty timeline. Every row is seed: true.
import { set, subDays } from 'date-fns';

import { PATIENT_ID, STAFF } from '@/config';
import { db } from '@/data/db/client';
import { checkIns, logs, messages } from '@/data/db/schema';
import { isoDay, uid } from '@/domain/day';

function at(daysAgo: number, hours: number, minutes: number): Date {
  return set(subDays(new Date(), daysAgo), { hours, minutes, seconds: 0, milliseconds: 0 });
}

export async function seedHistory(episodeId: string) {
  const now = new Date();
  const checkInAt = at(1, 9, 2);
  const noteAt = at(2, 20, 15);
  // The nurse wrote earlier today, or a few minutes ago if setup happens before 10.14.
  const morning = at(0, 10, 14);
  const messageAt = morning < now ? morning : new Date(now.getTime() - 5 * 60_000);
  const checkInId = uid();

  await db.insert(checkIns).values({
    id: checkInId,
    episodeId,
    date: isoDay(checkInAt),
    answers: { pain: 5, temperature: 37.4, swelling: 'same', wound: 'dry', calfPain: false, breathing: false, walking: true, wellbeing: 3 },
    authoredBy: PATIENT_ID,
    createdAt: checkInAt.toISOString(),
    reviewedAt: at(1, 11, 30).toISOString(),
    reviewedBy: STAFF.id,
    seed: true,
  });

  await db.insert(logs).values({
    id: uid(),
    episodeId,
    type: 'text',
    source: 'dictated',
    text: 'Ponoči sem slabo spala, koleno je peklo.',
    mediaUrl: null,
    extracted: {},
    authoredBy: PATIENT_ID,
    createdAt: noteAt.toISOString(),
    reviewedAt: at(1, 8, 10).toISOString(),
    seed: true,
  });

  await db.insert(messages).values({
    id: uid(),
    episodeId,
    fromUserId: STAFF.id,
    fromName: STAFF.name,
    body: 'Fotografija je jasna, rana lepo celi. Jutri zjutraj nam sporočite še temperaturo.',
    createdAt: messageAt.toISOString(),
    readAt: null,
    refType: 'checkin',
    refId: checkInId,
    seed: true,
  });
}
