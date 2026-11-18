import { approveAll, type CoverageLookup } from './drugs';
import { CARE_PRICES } from './rules2027';
import type { EvaluatedPlan, Household, Member } from './types';

/**
 * Your scenario: the care you want to price every plan against. You set it with the scenario controls, starting from a
 * preset. Each plan also shows its worst case, which needs no assumptions beyond your medications.
 */
export const LISTED_CARE = [0, 0.5, 1, 2] as const;
export type ListedCare = (typeof LISTED_CARE)[number];

export interface CareScenario {
  /** How much of your listed visits and tests to count: none, half, as listed, or double. Medications aren't scaled. */
  listedCare: ListedCare;
  /** Unplanned care, for the person in forMember. */
  hospitalStays: number;
  erVisits: number;
  /** Other major covered care, as the amount billed before insurance (surgery, cancer care…). */
  majorBill: number;
  /** Member id for unplanned care; null means the first person listed. */
  forMember: string | null;
  /** Drugs (RxNorm ids) assumed approved by exception on plans that don't list them. */
  approved: string[];
  /** Medications (care item ids) left out, to see a year without them. */
  stopped: string[];
}

export type PresetId = 'listed' | 'er' | 'stay' | 'major';
type CarePart = Pick<CareScenario, 'listedCare' | 'hospitalStays' | 'erVisits' | 'majorBill'>;

export const MAJOR_BILL = 100_000;
export const PRESETS: { id: PresetId; label: string; care: CarePart }[] = [
  { id: 'listed', label: 'Listed care only', care: { listedCare: 1, hospitalStays: 0, erVisits: 0, majorBill: 0 } },
  { id: 'er', label: '+ an ER visit', care: { listedCare: 1, hospitalStays: 0, erVisits: 1, majorBill: 0 } },
  { id: 'stay', label: '+ a hospital stay', care: { listedCare: 1, hospitalStays: 1, erVisits: 0, majorBill: 0 } },
  { id: 'major', label: '+ a major illness', care: { listedCare: 1, hospitalStays: 0, erVisits: 0, majorBill: MAJOR_BILL } },
];

export const DEFAULT_SCENARIO: CareScenario = { ...PRESETS[0].care, forMember: null, approved: [], stopped: [] };

/** The preset the care settings match, or null for a custom scenario. Medication choices don't affect it. */
export function presetOf(s: CareScenario): PresetId | null {
  return PRESETS.find((p) => (Object.keys(p.care) as (keyof CarePart)[]).every((k) => p.care[k] === s[k]))?.id ?? null;
}

const SCALED = ['primaryVisits', 'specialistVisits', 'labTests', 'diagnosticTests', 'scans', 'erVisits', 'hospitalStays'] as const;

/** The household as the scenario describes it: listed care scaled, unplanned care added, stopped medications left out. */
export function applyScenario(household: Household, s: CareScenario): Household {
  const target = household.members.find((m) => m.id === s.forMember) ?? household.members[0];
  const members = household.members.map((m) => {
    const next: Member = { ...m };
    for (const key of SCALED) next[key] = Math.round(m[key] * s.listedCare);
    next.selfPayDrugs = Object.fromEntries(Object.entries(m.selfPayDrugs).filter(([id]) => !s.stopped.includes(id)));
    if (m.drugs) next.drugs = m.drugs.filter((d) => !s.stopped.includes(d.itemId));
    if (m === target) {
      next.hospitalStays += s.hospitalStays;
      next.erVisits += s.erVisits;
      if (s.majorBill > 0) next.majorBill = s.majorBill;
    }
    return next;
  });
  return { ...household, members };
}

/** Drug coverage as the scenario assumes it: your approved exceptions count as covered. */
export const scenarioLookup = (lookup: CoverageLookup, s: CareScenario): CoverageLookup => approveAll(lookup, s.approved);

const money0 = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** "your listed care + 1 hospital stay for Pat · Testdrug approved where not listed", for the one-line summary. */
export function scenarioSummary(s: CareScenario, members: { id: string; label: string }[], names: Record<string, string>): string {
  const who = (members.find((m) => m.id === s.forMember) ?? members[0])?.label || 'the first person';
  const care = s.listedCare === 0 ? 'no listed visits or tests' : s.listedCare === 1 ? 'your listed care' : s.listedCare === 0.5 ? 'half your listed care' : `${s.listedCare}× your listed care`;
  const extras = [
    s.hospitalStays > 0 && `${s.hospitalStays} hospital stay${s.hospitalStays === 1 ? '' : 's'}`,
    s.erVisits > 0 && `${s.erVisits} ER visit${s.erVisits === 1 ? '' : 's'}`,
    s.majorBill > 0 && `a ${money0(s.majorBill)} major bill`,
  ].filter(Boolean);
  const meds = [
    ...s.approved.filter((r) => names[r]).map((r) => `${names[r]} approved where not listed`),
    ...s.stopped.filter((id) => names[id]).map((id) => `no ${names[id]}`),
  ];
  return [extras.length ? `${care} + ${extras.join(' + ')} for ${who}` : care, ...meds].join(' · ');
}

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
export const ER_VISIT_PRICE = CARE_PRICES.erVisit;

export type ScenarioId = 'scenario' | 'worst';

export interface ScenarioParts {
  id: ScenarioId;
  premiums: number;
  /** What you pay toward covered care: copays, deductible, coinsurance, or the out-of-pocket limit. */
  care: number;
  /** The part of care for covered medications, fill by fill; null in the worst case, where the limit covers everything. */
  coveredDrugs: number | null;
  /** Medications paid in cash, outside the deductible and out-of-pocket limit: the sum of the two below. */
  cash: number;
  /** Linked medications this plan doesn't cover (and you haven't assumed approved). */
  uncoveredDrugs: number;
  /** Medications you pay in cash on every plan. */
  alwaysCash: number;
  total: number;
}

/** Your scenario and the worst case, split into the same parts, or null when the plan's benefits are unknown. */
export function scenarioParts(p: EvaluatedPlan): ScenarioParts[] | null {
  if (p.careScenario === null || p.oopMax === null) return null;
  const coveredDrugs = Object.values(p.drugCosts).reduce((sum, d) => sum + (d.kind === 'plan' ? d.yearly : 0), 0);
  const row = (id: ScenarioId, care: number, drugs: number | null): ScenarioParts => ({
    id,
    premiums: p.premiumYear,
    care,
    coveredDrugs: drugs,
    cash: p.selfPayYear,
    uncoveredDrugs: p.uncoveredDrugsYear,
    alwaysCash: p.selfPayYear - p.uncoveredDrugsYear,
    total: p.premiumYear + care + p.selfPayYear,
  });
  return [row('scenario', p.careScenario, coveredDrugs), row('worst', p.oopMax, null)];
}
