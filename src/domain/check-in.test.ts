import { describe, expect, it } from 'vitest';

import { protocol, type Answers, type Condition } from '../data/api';
import { conditionHolds, pruneAnswers, toggleMulti, triggeredAlert, visibleQuestions } from './check-in';

// Shaped like the server's knee-replacement protocol (nulls included, as the server sends them).
const n = { min: null, max: null, unit: null, options: null, labels: null, exclusiveOptions: null, showIf: null, immediateAlert: null, skipLabel: null };
const { questions, rules } = protocol.parse({
  id: 'knee-replacement',
  durationDays: 42,
  rules: [{ id: 'calf', field: 'symptoms', op: 'in', value: ['calf'], severity: 'attention' }],
  questions: [
    { ...n, id: 'feeling', type: 'choice', text: 'Počutje?', options: ['very_bad', 'bad', 'ok', 'good'] },
    { ...n, id: 'feelingCause', type: 'choice', text: 'Zakaj?', options: ['pain', 'other'], showIf: { question: 'feeling', op: 'in', value: ['very_bad', 'bad'] } },
    { ...n, id: 'pain', type: 'scale', text: 'Bolečina?', min: 0, max: 10 },
    { ...n, id: 'painWhen', type: 'choice', text: 'Kdaj?', options: ['rest', 'walking'], showIf: { question: 'pain', op: '>=', value: 5 } },
    {
      ...n,
      id: 'wound',
      type: 'multichoice',
      text: 'Rana?',
      options: ['none', 'redness', 'discharge', 'opening', 'cannot_check'],
      exclusiveOptions: ['none', 'cannot_check'],
    },
    { ...n, id: 'woundPhoto', type: 'photo', text: 'Fotografija', skipLabel: 'Preskoči', showIf: { question: 'wound', op: 'in', value: ['redness', 'discharge', 'opening'] } },
    { ...n, id: 'woundWhyNot', type: 'choice', text: 'Zakaj ne?', options: ['bandage', 'other'], showIf: { question: 'wound', op: '==', value: 'cannot_check' } },
    {
      ...n,
      id: 'symptoms',
      type: 'multichoice',
      text: 'Simptomi?',
      options: ['fever', 'calf', 'breathing_chest', 'fainting', 'none'],
      exclusiveOptions: ['none'],
      immediateAlert: { options: ['breathing_chest', 'fainting'], title: 'Pokličite 112', text: 'Takoj pokličite 112.', action: 'call_112' },
    },
    { ...n, id: 'temperature', type: 'number', text: 'Temperatura?', unit: '°C', skipLabel: 'Nisem izmeril', showIf: { question: 'symptoms', op: 'in', value: ['fever'] } },
    { ...n, id: 'calfLeg', type: 'choice', text: 'Katera noga?', options: ['left', 'right'], showIf: { question: 'symptoms', op: 'in', value: ['calf'] } },
    { ...n, id: 'notes', type: 'text', text: 'Še kaj?', required: false },
  ],
});

const ids = (a: Answers) => visibleQuestions(questions, a).map((q) => q.id);
const base = ['feeling', 'pain', 'wound', 'symptoms', 'notes'];

describe('the server protocol parses', () => {
  it('keeps every question, the new fields, and in-rules', () => {
    expect(questions).toHaveLength(11);
    expect(rules).toHaveLength(1);
    const wound = questions[4];
    expect(wound.type === 'multichoice' && wound.exclusiveOptions).toEqual(['none', 'cannot_check']);
    expect(questions[5]).toMatchObject({ skipLabel: 'Preskoči', showIf: { question: 'wound', op: 'in' } });
  });
});

describe('visibleQuestions', () => {
  it('asks only unconditional questions with no answers', () => {
    expect(ids({})).toEqual(base);
  });
  it('feeling "bad" reveals feelingCause; "good" does not', () => {
    expect(ids({ feeling: 'bad' })).toContain('feelingCause');
    expect(ids({ feeling: 'good' })).not.toContain('feelingCause');
  });
  it('pain 6 reveals painWhen, pain 4 does not', () => {
    expect(ids({ pain: 6 })).toContain('painWhen');
    expect(ids({ pain: 4 })).not.toContain('painWhen');
  });
  it('wound redness reveals the photo; cannot_check reveals woundWhyNot', () => {
    expect(ids({ wound: ['redness'] })).toContain('woundPhoto');
    expect(ids({ wound: ['cannot_check'] })).toEqual(expect.arrayContaining(['woundWhyNot']));
    expect(ids({ wound: ['cannot_check'] })).not.toContain('woundPhoto');
    expect(ids({ wound: ['none'] })).toEqual(base);
  });
  it('fever reveals temperature, calf reveals calfLeg, both reveal both in order', () => {
    expect(ids({ symptoms: ['fever'] })).toContain('temperature');
    expect(ids({ symptoms: ['calf'] })).toContain('calfLeg');
    expect(ids({ symptoms: ['fever', 'calf'] })).toEqual([...base.slice(0, 4), 'temperature', 'calfLeg', 'notes']);
  });
});

describe('pruneAnswers', () => {
  it('drops answers to questions no longer asked after a parent changes', () => {
    const before: Answers = { feeling: 'bad', feelingCause: 'pain', pain: 7, painWhen: 'rest', symptoms: ['fever'], temperature: 38.2 };
    expect(pruneAnswers(questions, { ...before, feeling: 'good', pain: 2, symptoms: ['none'] })).toEqual({ feeling: 'good', pain: 2, symptoms: ['none'] });
  });
  it('cascades: a child of a hidden question is hidden too', () => {
    const qs = protocol.parse({
      id: 'p',
      durationDays: 1,
      rules: [],
      questions: [
        { id: 'a', type: 'choice', text: 'A', options: ['x', 'y'] },
        { id: 'b', type: 'choice', text: 'B', options: ['x', 'y'], showIf: { question: 'a', op: '==', value: 'x' } },
        { id: 'c', type: 'text', text: 'C', showIf: { question: 'b', op: '==', value: 'x' } },
      ],
    }).questions;
    expect(pruneAnswers(qs, { a: 'y', b: 'x', c: 'stale' })).toEqual({ a: 'y' });
    expect(pruneAnswers(qs, { a: 'x', b: 'x', c: 'ok' })).toEqual({ a: 'x', b: 'x', c: 'ok' });
  });
  it('ignores a showIf on a later question (only earlier answers count)', () => {
    const qs = protocol.parse({
      id: 'p',
      durationDays: 1,
      rules: [],
      questions: [
        { id: 'a', type: 'text', text: 'A', showIf: { question: 'b', op: '==', value: 'x' } },
        { id: 'b', type: 'text', text: 'B' },
      ],
    }).questions;
    expect(visibleQuestions(qs, { b: 'x' }).map((q) => q.id)).toEqual(['b']);
  });
});

describe('conditionHolds', () => {
  const c = (op: Condition['op'], value: Condition['value']): Condition => ({ question: 'q', op, value });
  it.each([
    ['==', 3, 3, true],
    ['==', 3, 4, false],
    ['!=', 3, 4, true],
    ['>', 4, 3, true],
    ['>', 3, 3, false],
    ['>=', 3, 3, true],
    ['<', 2, 3, true],
    ['<=', 3, 3, true],
    ['<=', 4, 3, false],
  ] as const)('numbers: %s (answer %s, value %s) → %s', (op, answer, value, expected) => {
    expect(conditionHolds(c(op, value), { q: answer })).toBe(expected);
  });
  it('strings', () => {
    expect(conditionHolds(c('==', 'bad'), { q: 'bad' })).toBe(true);
    expect(conditionHolds(c('!=', 'bad'), { q: 'bad' })).toBe(false);
    expect(conditionHolds(c('in', ['bad', 'very_bad']), { q: 'very_bad' })).toBe(true);
    expect(conditionHolds(c('in', ['bad']), { q: 'good' })).toBe(false);
    expect(conditionHolds(c('>', 3), { q: 'bad' })).toBe(false);
  });
  it('arrays', () => {
    expect(conditionHolds(c('in', ['fever', 'calf']), { q: ['none'] })).toBe(false);
    expect(conditionHolds(c('in', ['fever', 'calf']), { q: ['calf', 'fainting'] })).toBe(true);
    expect(conditionHolds(c('==', 'calf'), { q: ['calf', 'fever'] })).toBe(true);
    expect(conditionHolds(c('!=', 'calf'), { q: ['fever'] })).toBe(true);
  });
  it('a missing answer never holds, even for !=', () => {
    expect(conditionHolds(c('!=', 'x'), {})).toBe(false);
  });
  it('booleans', () => {
    expect(conditionHolds(c('==', true), { q: true })).toBe(true);
    expect(conditionHolds(c('in', ['true']), { q: true })).toBe(true);
  });
});

describe('toggleMulti', () => {
  const ex = ['none'];
  it('adds and removes options', () => {
    expect(toggleMulti(undefined, 'fever', ex)).toEqual(['fever']);
    expect(toggleMulti(['fever'], 'calf', ex)).toEqual(['fever', 'calf']);
    expect(toggleMulti(['fever', 'calf'], 'fever', ex)).toEqual(['calf']);
    expect(toggleMulti(['fever'], 'fever', ex)).toBeUndefined();
  });
  it('an exclusive option clears the others and is cleared by them', () => {
    expect(toggleMulti(['fever', 'calf'], 'none', ex)).toEqual(['none']);
    expect(toggleMulti(['none'], 'fever', ex)).toEqual(['fever']);
  });
});

describe('triggeredAlert', () => {
  const symptoms = questions.find((q) => q.id === 'symptoms')!;
  it('fires on any alert option, not on others', () => {
    expect(triggeredAlert(symptoms, ['breathing_chest'])?.title).toBe('Pokličite 112');
    expect(triggeredAlert(symptoms, ['fever', 'fainting'])).not.toBeNull();
    expect(triggeredAlert(symptoms, ['fever'])).toBeNull();
    expect(triggeredAlert(symptoms, undefined)).toBeNull();
  });
});
