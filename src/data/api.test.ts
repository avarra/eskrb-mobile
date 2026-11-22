import { describe, expect, it } from 'vitest';

import { protocol } from './api';
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
