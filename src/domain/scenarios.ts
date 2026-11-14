import { CARE_PRICES } from './rules2027';
import type { EvaluatedPlan, Member } from './types';

export type ScenarioId = 'expected' | 'bad' | 'worst';

export interface Scenario {
  id: ScenarioId;
  name: string;
  /** The question the number answers, in the reader's words. */
  question: string;
  /** How many of three bars to fill in the severity mark. */
  severity: 1 | 2 | 3;
  useItTo: string;
}

export const SCENARIOS: Scenario[] = [
  { id: 'expected', name: 'Expected year', question: 'What will a normal year cost us?', severity: 1, useItTo: 'Compare plans for the year you expect.' },
  { id: 'bad', name: 'Bad year', question: 'What if something unplanned happens?', severity: 2, useItTo: 'See which plan softens a rough year.' },
  { id: 'worst', name: 'Worst case', question: 'What is the most we could pay?', severity: 3, useItTo: 'Make sure you could afford the ceiling.' },
];

const COUNT_LABELS: [keyof Member, string, string][] = [
  ['primaryVisits', 'primary care visit', 'primary care visits'],
  ['specialistVisits', 'specialist visit', 'specialist visits'],
  ['labTests', 'lab test', 'lab tests'],
  ['diagnosticTests', 'imaging or eye test', 'imaging or eye tests'],
  ['scans', 'CT or MRI scan', 'CT or MRI scans'],
  ['genericFills', 'generic fill', 'generic fills'],
  ['brandFills', 'brand-name fill', 'brand-name fills'],
  ['erVisits', 'ER visit', 'ER visits'],
  ['hospitalStays', 'hospital stay', 'hospital stays'],
];

/** "3 specialist visits, 2 lab tests and 12 generic fills" for the whole household. */
export function careSummary(members: Member[]): string {
  const parts = COUNT_LABELS.flatMap(([key, one, many]) => {
    const n = members.reduce((sum, m) => sum + (m[key] as number), 0);
    return n > 0 ? [`${n} ${n === 1 ? one : many}`] : [];
  });
  if (!parts.length) return 'no care listed yet';
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export const HOSPITAL_STAY = { price: CARE_PRICES.hospitalStay, days: CARE_PRICES.hospitalDays };

export interface ScenarioParts {
  id: ScenarioId;
  premiums: number;
  /** What you pay toward covered care: copays, deductible, coinsurance, or the out-of-pocket limit. */
  care: number;
  cash: number;
  total: number;
}

/** The three totals split into the same three parts, or null when the plan's benefits are unknown. */
export function scenarioParts(p: EvaluatedPlan): ScenarioParts[] | null {
  if (p.careExpected === null || p.careBadYear === null || p.oopMax === null) return null;
  const row = (id: ScenarioId, care: number) => ({ id, premiums: p.premiumYear, care, cash: p.selfPayYear, total: p.premiumYear + care + p.selfPayYear });
  return [row('expected', p.careExpected), row('bad', p.careBadYear), row('worst', p.oopMax)];
}
