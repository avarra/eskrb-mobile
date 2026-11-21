import type { AnswerValue, Answers, PatientAction, Rule, Severity } from '../data/api';

export type RuleHit = { ruleId: string; field: string; severity: Severity; value: AnswerValue };

function compare(actual: AnswerValue, op: Rule['op'], expected: AnswerValue): boolean {
  if (op === '==') return actual === expected;
  if (op === '!=') return actual !== expected;
  if (typeof actual !== 'number' || typeof expected !== 'number') return false;
  switch (op) {
    case '>=':
      return actual >= expected;
    case '>':
      return actual > expected;
    case '<=':
      return actual <= expected;
    case '<':
      return actual < expected;
  }
}

export function actionFor(severities: readonly Severity[]): PatientAction {
  if (severities.includes('urgent')) return 'call_112';
  if (severities.includes('attention')) return 'contact_team';
  return 'none';
}

/** Evaluate protocol rules against answers (from a check-in or extracted from a note). */
export function evaluate(rules: readonly Rule[], answers: Answers): { hits: RuleHit[]; patientAction: PatientAction } {
  const hits: RuleHit[] = [];
  for (const rule of rules) {
    const value = answers[rule.field];
    if (value === undefined) continue;
    if (compare(value, rule.op, rule.value)) {
      hits.push({ ruleId: rule.id, field: rule.field, severity: rule.severity, value });
    }
  }
  return { hits, patientAction: actionFor(hits.map((h) => h.severity)) };
}
