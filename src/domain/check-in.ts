import type { Answers, NewCheckIn, Question } from '@/data/api';

/** Photo answers (local file URIs while stepping through the check-in) go as file parts; the rest as JSON. */
export function splitPhotoAnswers(questions: readonly Question[], all: Answers): NewCheckIn {
  const photoIds = new Set(questions.filter((q) => q.type === 'photo').map((q) => q.id));
  const answers: Answers = {};
  const photos: Record<string, string> = {};
  for (const [id, v] of Object.entries(all)) {
    if (!photoIds.has(id)) answers[id] = v;
    else if (typeof v === 'string' && v) photos[id] = v;
  }
  return { answers, photos };
}
