import type { AnswerValue, Question } from '@/data/api';
import { ChoicePills } from '@/components/questions/choice-pills';
import { NumberStepper } from '@/components/questions/number-stepper';
import { PhotoQuestion } from '@/components/questions/photo-question';
import { ScaleWedge } from '@/components/questions/scale-wedge';
import { sl } from '@/copy/sl';

export const TEMPERATURE_START = 36.8;

/** Pain is the 0–10 scale; every other scale (wellbeing) is neutral and must not borrow the pain colours. */
export function isPain(q: Extract<Question, { type: 'scale' }>) {
  return q.id === 'pain';
}

export function wordsFor(q: Extract<Question, { type: 'scale' }>) {
  return isPain(q) ? sl.pain.words : sl.wellbeing.words;
}

/** Initial answer when a question first appears (only the number starts with a value). */
export function initialAnswer(q: Question): AnswerValue | undefined {
  return q.type === 'number' ? TEMPERATURE_START : undefined;
}

export function hintFor(q: Question): string {
  switch (q.type) {
    case 'scale':
      return sl.checkin.scaleHint;
    case 'number':
      return sl.checkin.numberHint;
    case 'choice':
    case 'boolean':
      return sl.checkin.choiceHint;
    case 'photo':
      return sl.checkin.photoHint;
  }
}

/** Renders any protocol question generically by `type`. */
export function QuestionView({ question: q, value, onChange, onClear }: {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  /** Unanswer the question (removing a photo). */
  onClear: () => void;
}) {
  switch (q.type) {
    case 'scale':
      return (
        <ScaleWedge
          min={q.min}
          max={q.max}
          value={typeof value === 'number' ? value : undefined}
          onChange={onChange}
          words={wordsFor(q)}
          label={q.text}
          tone={isPain(q) ? 'heat' : 'calm'}
        />
      );
    case 'number':
      return <NumberStepper value={typeof value === 'number' ? value : TEMPERATURE_START} unit={q.unit} onChange={onChange} label={q.text} />;
    case 'choice':
      return (
        <ChoicePills
          options={q.options.map((o) => ({ value: o, label: sl.options[o] ?? o }))}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
        />
      );
    case 'boolean':
      return (
        <ChoicePills
          options={[
            { value: true, label: sl.checkin.yes },
            { value: false, label: sl.checkin.no },
          ]}
          value={typeof value === 'boolean' ? value : undefined}
          onChange={onChange}
        />
      );
    case 'photo':
      return <PhotoQuestion value={typeof value === 'string' ? value : undefined} onChange={onChange} onClear={onClear} label={q.text} />;
  }
}
