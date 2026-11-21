// Stand-in for the backend LLM extractor: keyword matching on the note text.
// Delete this file when the real API does extraction.
import type { Answers } from '../data/api';

export type Extraction = { extracted: Answers; quotes: Record<string, string> };

/** Lowercase and strip Slovenian diacritics so "Meča" and "meca" both match. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/č/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/ć/g, 'c')
    .replace(/đ/g, 'd');
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const CALF = /\bmec(a|e|i|o|u|ih|ema|ami)?\b|\bmecih\b|\bmecu\b/;
const BREATHING = /dih|\bprsi|\bprsih|\bprsnem|\bprsnic/;
const TEMPERATURE = /vrocin|temperatur/;
const NUMBER = /(\d{2})(?:[.,](\d))?/;

export function extractLocal(text: string): Extraction {
  const extracted: Answers = {};
  const quotes: Record<string, string> = {};
  for (const sentence of sentences(text)) {
    const f = fold(sentence);
    if (!('calfPain' in extracted) && CALF.test(f)) {
      extracted.calfPain = true;
      quotes.calfPain = sentence;
    }
    if (!('breathing' in extracted) && BREATHING.test(f)) {
      extracted.breathing = true;
      quotes.breathing = sentence;
    }
    if (!('temperature' in extracted) && TEMPERATURE.test(f)) {
      const m = NUMBER.exec(f);
      if (m) {
        const value = Number(`${m[1]}.${m[2] ?? '0'}`);
        if (value >= 34 && value <= 43) {
          extracted.temperature = value;
          quotes.temperature = sentence;
        }
      }
    }
  }
  return { extracted, quotes };
}
