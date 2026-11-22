import { describe, expect, it } from 'vitest';

import { buddyMessage, buddyState, careNotes, protocol } from './api';
import { splitPhotoAnswers } from '../domain/check-in';
import { initials } from '../domain/format';

describe('protocol from the server', () => {
  it('accepts null optional fields on questions', () => {
    const p = protocol.parse({
      id: 'knee-replacement',
      name: 'Knee replacement',
      durationDays: 42,
      questions: [
        { id: 'pain', type: 'scale', text: 'Bolečina?', min: 0, max: 10, unit: null, options: null },
        { id: 'wound', type: 'choice', text: 'Rana?', min: null, max: null, unit: null, options: ['dry', 'red', 'discharge'] },
        { id: 'calfPain', type: 'boolean', text: 'Meča?', min: null, max: null, unit: null, options: null },
        { id: 'temperature', type: 'number', text: 'Temperatura?', min: null, max: null, unit: '°C', options: null },
      ],
      rules: [{ id: 'calf', field: 'calfPain', op: '==', value: true, severity: 'urgent' }],
    });
    expect(p.questions.map((q) => q.type)).toEqual(['scale', 'choice', 'boolean', 'number']);
    expect(p.questions[1]).not.toHaveProperty('min');
  });

  it('accepts photo questions and the required flag', () => {
    const p = protocol.parse({
      id: 'wound',
      durationDays: 14,
      questions: [
        { id: 'pain', type: 'scale', text: 'Bolečina?', min: 0, max: 10, unit: null, options: null, required: true },
        { id: 'woundPhoto', type: 'photo', text: 'Fotografija rane', min: null, max: null, unit: null, options: null, required: false },
      ],
      rules: [],
    });
    expect(p.questions[1]).toEqual({ id: 'woundPhoto', type: 'photo', text: 'Fotografija rane', required: false });
  });

  it('accepts free-text questions (as the server sends them, with skipExtraction)', () => {
    const p = protocol.parse({
      id: 'knee',
      durationDays: 42,
      questions: [
        { id: 'notes', type: 'text', text: 'Želite še kaj dodati? (neobvezno)', min: null, max: null, unit: null, options: null, required: false, skipExtraction: false },
      ],
      rules: [],
    });
    expect(p.questions).toEqual([{ id: 'notes', type: 'text', text: 'Želite še kaj dodati? (neobvezno)', required: false }]);
  });
});

describe('splitPhotoAnswers', () => {
  const questions = protocol.parse({
    id: 'wound',
    durationDays: 14,
    questions: [
      { id: 'pain', type: 'scale', text: 'Bolečina?', min: 0, max: 10 },
      { id: 'woundPhoto', type: 'photo', text: 'Rana' },
      { id: 'drainPhoto', type: 'photo', text: 'Dren' },
    ],
    rules: [],
  }).questions;

  it('moves photo answers to file parts and keeps the rest as JSON', () => {
    expect(splitPhotoAnswers(questions, { pain: 3, woundPhoto: 'file:///tmp/a.jpg' })).toEqual({
      answers: { pain: 3 },
      photos: { woundPhoto: 'file:///tmp/a.jpg' },
    });
  });

  it('drops empty photo answers', () => {
    expect(splitPhotoAnswers(questions, { drainPhoto: '' })).toEqual({ answers: {}, photos: {} });
  });
});

describe('initials', () => {
  it('skips titles', () => {
    expect(initials('Dr. Maja Zupan')).toBe('MZ');
    expect(initials('Sestra Petra Žagar')).toBe('PŽ');
    expect(initials('')).toBe('·');
  });
});

describe('buddy schemas', () => {
  it('accepts a null buddy (no pair, or a pair a person ended)', () => {
    expect(buddyState.parse({ status: 'none', buddy: null, unread: 0, moments: [], cheers: [] }).buddy).toBeNull();
    expect(buddyState.parse({ status: 'ended', buddy: null, unread: 2, moments: [], cheers: [] }).unread).toBe(2);
  });

  it('drops unknown moments and unparseable cheers instead of failing', () => {
    const s = buddyState.parse({
      status: 'active',
      buddy: { firstName: 'Nina', dayNumber: '6', checkedInToday: false, streak: 0, missedDays: 3, finished: false },
      unread: 0,
      moments: ['not_checked_in', 'birthday', 7, 'missed_days'],
      cheers: [
        { id: 'remind', moment: 'not_checked_in', label: 'Spomnite', text: 'Ne pozabite.', starter: null, nudge: true },
        { id: 'broken' },
        { id: 'until-tomorrow', moment: 'always', label: 'Do jutri', text: 'Do jutri.' },
      ],
    });
    expect(s.moments).toEqual(['not_checked_in', 'missed_days']);
    expect(s.cheers.map((c) => c.id)).toEqual(['remind', 'until-tomorrow']);
    expect(s.cheers[1]).toMatchObject({ starter: null, nudge: false });
    expect(s.buddy?.dayNumber).toBe(6);
  });

  it('accepts a message with a missing or null source (cheers)', () => {
    const base = { id: '1', fromMe: false, kind: 'cheer', text: 'Držim pesti.', createdAt: '2026-11-21T15:05:00.123456Z' };
    expect(buddyMessage.parse(base).source).toBeNull();
    expect(buddyMessage.parse({ ...base, source: null }).source).toBeNull();
    expect(buddyMessage.parse({ ...base, kind: 'text', source: 'dictated' }).source).toBe('dictated');
  });
});

describe('careNotes', () => {
  it('keeps medication and advice notes and drops kinds the patient must not see', () => {
    const at = '2026-11-20T08:00:00Z';
    const notes = careNotes.parse([
      { id: '1', kind: 'medication', title: null, body: 'Xarelto 10 mg zjutraj', createdAt: at, updatedAt: at },
      { id: '2', kind: 'advice', title: 'Hlajenje', body: 'Koleno hladite 20 minut.', createdAt: at, updatedAt: at },
      { id: '3', kind: 'private', title: null, body: 'interno', createdAt: at, updatedAt: at },
    ]);
    expect(notes.map((n) => [n.id, n.kind, n.title])).toEqual([
      ['1', 'medication', null],
      ['2', 'advice', 'Hlajenje'],
    ]);
  });
});
