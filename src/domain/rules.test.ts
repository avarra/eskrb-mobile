import { describe, expect, it } from 'vitest';

import { kneeReplacement } from '../data/protocol';
import { extractLocal } from './extract-local';
import { evaluate } from './rules';

const normal = { pain: 3, temperature: 36.8, swelling: 'same', wound: 'dry', calfPain: false, breathing: false, walking: true, wellbeing: 4 };
const run = (patch: Record<string, number | string | boolean>) => evaluate(kneeReplacement.rules, { ...normal, ...patch });

describe('rules (PLAN-mobile.md)', () => {
  it('a normal check-in needs no action', () => {
    expect(run({})).toEqual({ hits: [], patientAction: 'none' });
  });

  it('calf pain → call_112', () => {
    const r = run({ calfPain: true });
    expect(r.patientAction).toBe('call_112');
    expect(r.hits.map((h) => h.ruleId)).toEqual(['calf']);
  });

  it('breathing → call_112', () => {
    expect(run({ breathing: true }).patientAction).toBe('call_112');
  });

  it('fever at 38.0 → contact_team, 37.9 → none', () => {
    expect(run({ temperature: 38.0 }).patientAction).toBe('contact_team');
    expect(run({ temperature: 37.9 }).patientAction).toBe('none');
  });

  it('wound discharge → contact_team, red → none', () => {
    expect(run({ wound: 'discharge' }).patientAction).toBe('contact_team');
    expect(run({ wound: 'red' }).patientAction).toBe('none');
  });

  it('pain 8 or more → contact_team, 7 → none', () => {
    expect(run({ pain: 8 }).patientAction).toBe('contact_team');
    expect(run({ pain: 10 }).patientAction).toBe('contact_team');
    expect(run({ pain: 7 }).patientAction).toBe('none');
  });

  it('urgent wins over attention', () => {
    const r = run({ pain: 9, calfPain: true });
    expect(r.patientAction).toBe('call_112');
    expect(r.hits.map((h) => h.severity).sort()).toEqual(['attention', 'urgent']);
  });

  it('ignores fields that were not answered', () => {
    expect(evaluate(kneeReplacement.rules, {})).toEqual({ hits: [], patientAction: 'none' });
  });
});

describe('extractLocal', () => {
  it('finds calf pain and keeps the quote', () => {
    const text = 'Dobro sem spala. Od jutra me boli leva meča in je bolj trda kot včeraj.';
    const { extracted, quotes } = extractLocal(text);
    expect(extracted).toEqual({ calfPain: true });
    expect(quotes.calfPain).toBe('Od jutra me boli leva meča in je bolj trda kot včeraj.');
    expect(evaluate(kneeReplacement.rules, extracted).patientAction).toBe('call_112');
  });

  it('matches calf without diacritics and in other cases', () => {
    expect(extractLocal('boli me meca').extracted.calfPain).toBe(true);
    expect(extractLocal('Oteklina v mečih.').extracted.calfPain).toBe(true);
  });

  it('finds breathing and chest words', () => {
    expect(extractLocal('Težko diham.').extracted.breathing).toBe(true);
    expect(extractLocal('Stiska me v prsih.').extracted.breathing).toBe(true);
  });

  it('reads a temperature with a decimal comma', () => {
    const { extracted } = extractLocal('Imam vročino, 38,4 stopinje.');
    expect(extracted.temperature).toBe(38.4);
    expect(evaluate(kneeReplacement.rules, extracted).patientAction).toBe('contact_team');
  });

  it('needs a number for temperature', () => {
    expect(extractLocal('Mislim, da imam vročino.').extracted).toEqual({});
  });

  it('leaves an ordinary note alone', () => {
    expect(extractLocal('Ponoči sem slabo spala, koleno je peklo.').extracted).toEqual({});
  });
});
