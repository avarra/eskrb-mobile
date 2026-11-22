import type { AnswerValue, Answers, Condition, ImmediateAlert, NewCheckIn, Question } from '@/data/api';

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

/**
 * Whether a `showIf` holds. A missing parent answer never holds.
 * `in`: a single answer is one of the values; an array answer shares any of them.
 * `==` / `!=` on an array answer mean "includes" / "doesn't include". Ordering ops only compare numbers.
 */
export function conditionHolds(cond: Condition, answers: Answers): boolean {
  const a = answers[cond.question];
  if (a === undefined) return false;
  const v = cond.value;
  switch (cond.op) {
    case 'in': {
      const set = Array.isArray(v) ? v : [String(v)];
      return Array.isArray(a) ? a.some((x) => set.includes(x)) : set.includes(String(a));
    }
    case '==':
    case '!=': {
      const eq = Array.isArray(a) ? !Array.isArray(v) && a.includes(String(v)) : !Array.isArray(v) && a === v;
      return cond.op === '==' ? eq : !eq;
    }
    case '>':
    case '>=':
    case '<':
    case '<=': {
      if (typeof a !== 'number' || typeof v !== 'number') return false;
      if (cond.op === '>') return a > v;
      if (cond.op === '>=') return a >= v;
      if (cond.op === '<') return a < v;
      return a <= v;
    }
  }
}

/**
 * The questions to ask for these answers, in protocol order. A conditional question is asked only when its parent
 * came earlier, is itself asked, and the condition holds on the answers given so far (so hiding cascades).
 */
export function visibleQuestions(questions: readonly Question[], answers: Answers): Question[] {
  const visible: Question[] = [];
  const seen: Answers = {};
  for (const q of questions) {
    if (!q.showIf || conditionHolds(q.showIf, seen)) {
      visible.push(q);
      const a = answers[q.id];
      if (a !== undefined) seen[q.id] = a;
    }
  }
  return visible;
}

/** Drops answers to questions that are no longer asked (the server rejects them). */
export function pruneAnswers(questions: readonly Question[], answers: Answers): Answers {
  const kept: Answers = {};
  for (const q of visibleQuestions(questions, answers)) {
    const a = answers[q.id];
    if (a !== undefined) kept[q.id] = a;
  }
  return kept;
}

/** The safety stop this answer triggers, if any. */
export function triggeredAlert(q: Question, value: AnswerValue | undefined): ImmediateAlert | null {
  if ((q.type !== 'choice' && q.type !== 'multichoice') || !q.immediateAlert || value === undefined) return null;
  const picked = Array.isArray(value) ? value : [String(value)];
  return picked.some((o) => q.immediateAlert?.options.includes(o)) ? q.immediateAlert : null;
}

/**
 * Toggles one option of a multichoice answer. An exclusive option stands alone; picking another option clears it.
 * Deselecting the last option leaves the question unanswered.
 */
export function toggleMulti(current: readonly string[] | undefined, option: string, exclusive: readonly string[]): string[] | undefined {
  const cur = current ?? [];
  if (cur.includes(option)) {
    const rest = cur.filter((o) => o !== option);
    return rest.length ? rest : undefined;
  }
  if (exclusive.includes(option)) return [option];
  return [...cur.filter((o) => !exclusive.includes(o)), option];
}
