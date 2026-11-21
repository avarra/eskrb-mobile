import { describe, expect, it } from 'vitest';

import { protocol } from './api';
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
});

describe('initials', () => {
  it('skips titles', () => {
    expect(initials('Dr. Maja Zupan')).toBe('MZ');
    expect(initials('Sestra Petra Žagar')).toBe('PŽ');
    expect(initials('')).toBe('·');
  });
});
