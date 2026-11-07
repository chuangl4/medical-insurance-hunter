import { describe, expect, it, vi } from 'vitest';
import {
  benchmarkPremium,
  contributionPercent,
  estimateSubsidy,
  evaluatePlan,
  monthlyPremium,
  outOfPocket,
  povertyLine,
} from './calc';
import { EMPTY_FILTERS, applyFilters, sortPlans } from './filter';
import type { Benefits, Household, Member, Plan } from './types';
import { KING_COUNTY_PLANS } from '../data/kingCounty2027';
import { toggleCareNeed } from '../data/careNeeds';
import { hospitalStatus } from '../data/hospitalNetworks';

// Tests use fictional presets, so they don't depend on anyone's personal config.
vi.mock('../data/personalConfig', () => ({
  PERSONAL: {
    careNeeds: {
      testNeed: { label: 'Test need', adds: 'test care', care: { specialistVisits: 1, labTests: 1, diagnosticTests: 1 } },
    },
    hospitals: {
      testHospital: {
        name: 'Test Hospital',
        source: 'https://example.test',
        status: (p: Plan) => (p.carrier === 'Carrier In' ? 'in' : 'not-listed'),
      },
    },
  },
}));

const member = (age: number, extra: Partial<Member> = {}): Member => ({
  id: String(age),
  label: 'Person',
  age,
  primaryVisits: 0,
  specialistVisits: 0,
  genericFills: 0,
  brandFills: 0,
  labTests: 0,
  diagnosticTests: 0,
  scans: 0,
  erVisits: 0,
  hospitalStays: 0,
  careNeeds: [],
  selfPayDrugs: {},
  ...extra,
});

const benefits = (extra: Partial<Benefits> = {}): Benefits => ({
  deductible: { individual: 1000, family: 2000 },
  oopMax: { individual: 5000, family: 10000 },
  primary: { kind: 'copay', amount: 30, afterDeductible: false },
  specialist: { kind: 'copay', amount: 60, afterDeductible: false },
  genericRx: { kind: 'copay', amount: 10, afterDeductible: false },
  brandRx: { kind: 'copay', amount: 70, afterDeductible: false },
  lab: { kind: 'copay', amount: 25, afterDeductible: false },
  diagnostic: { kind: 'copay', amount: 40, afterDeductible: false },
  scan: { kind: 'coinsurance', rate: 0.2 },
  er: { kind: 'coinsurance', rate: 0.2 },
  hospital: { kind: 'coinsurance', rate: 0.2 },
  source: 'https://example.test',
  ...extra,
});

const plan = (extra: Partial<Plan> = {}): Plan => ({
  id: 'p',
  carrier: 'C',
  name: 'P',
  metal: 'silver',
  network: 'HMO',
  channel: 'on',
  hsaEligible: false,
  cascadeCare: false,
  publicOption: false,
  counties: 'all',
  basePremium: 100,
  ratesSource: 'https://example.test',
  benefits: benefits(),
  ...extra,
});

const household = (extra: Partial<Household> = {}): Household => ({
  county: 'King',
  members: [member(40)],
  taxHouseholdSize: 1,
  annualIncome: 50000,
  overSubsidyLimit: false,
  filingStatus: 'single',
  immigration: 'citizen',
  affordableEmployerOffer: false,
  ...extra,
});

describe('poverty line', () => {
  it('matches the published 2026 guidelines', () => {
    expect(povertyLine(1)).toBe(15960);
    expect(povertyLine(4)).toBe(33000);
  });
});

describe('contribution percent', () => {
  it('interpolates within a band and matches band edges', () => {
    expect(contributionPercent(100)).toBeCloseTo(2.15);
    expect(contributionPercent(133)).toBeCloseTo(3.23);
    expect(contributionPercent(175)).toBeCloseTo(5.54);
    expect(contributionPercent(300)).toBeCloseTo(10.22);
  });
  it('keeps 400% eligible and ends the credit above it', () => {
    expect(contributionPercent(400)).toBeCloseTo(10.22);
    expect(contributionPercent(400.01)).toBeNull();
  });
});

describe('monthly premium', () => {
  it('applies the age curve', () => {
    expect(monthlyPremium(plan(), [21])).toBeCloseTo(100);
    expect(monthlyPremium(plan(), [64])).toBeCloseTo(300);
    expect(monthlyPremium(plan(), [10])).toBeCloseTo(76.5);
  });
  it('charges only the three oldest children under 21', () => {
    expect(monthlyPremium(plan(), [21, 5, 6, 7, 8])).toBeCloseTo(100 + 3 * 76.5);
    expect(monthlyPremium(plan(), [20, 19, 18, 3])).toBeCloseTo(97 + 94.1 + 91.3);
  });
});

describe('subsidy', () => {
  const silver = [plan({ id: 'a', basePremium: 400 }), plan({ id: 'b', basePremium: 500 }), plan({ id: 'c', basePremium: 600 })];

  it('uses the second-lowest exchange silver plan as the benchmark', () => {
    expect(benchmarkPremium(silver, household({ members: [member(21)] }))).toBeCloseTo(500);
    const offOnly = [plan({ id: 'x', basePremium: 100, channel: 'off' }), ...silver];
    expect(benchmarkPremium(offOnly, household({ members: [member(21)] }))).toBeCloseTo(500);
  });

  it('computes the credit as benchmark minus expected contribution', () => {
    const income = povertyLine(1) * 3;
    const result = estimateSubsidy(silver, household({ members: [member(21)], annualIncome: income }));
    expect(result.status).toBe('eligible');
    expect(result.monthlyCredit).toBeCloseTo(500 - (income * 0.1022) / 12);
  });

  it('rules out the credit in each ineligible case', () => {
    const statusFor = (h: Partial<Household>) => estimateSubsidy(silver, household(h)).status;
    expect(statusFor({ annualIncome: null })).toBe('needs-income');
    expect(statusFor({ annualIncome: povertyLine(1) * 4.01 })).toBe('over-income');
    expect(statusFor({ annualIncome: povertyLine(1) })).toBe('likely-apple-health');
    expect(statusFor({ immigration: 'other' })).toBe('ineligible');
    expect(statusFor({ filingStatus: 'separate' })).toBe('ineligible');
    expect(statusFor({ affordableEmployerOffer: true })).toBe('ineligible');
  });
});

describe('out of pocket', () => {
  it('uses copays without touching the deductible', () => {
    expect(outOfPocket(benefits(), [member(40, { primaryVisits: 2, genericFills: 3 })])).toBe(90);
  });
  it('applies deductible then coinsurance', () => {
    expect(outOfPocket(benefits(), [member(40, { erVisits: 1 })])).toBe(1000 + 1500 * 0.2);
  });
  it('applies the deductible before an after-deductible copay', () => {
    const b = benefits({ er: { kind: 'copay', amount: 800, afterDeductible: true } });
    expect(outOfPocket(b, [member(40, { erVisits: 1 })])).toBe(1000 + 800);
    expect(outOfPocket(b, [member(40, { erVisits: 2 })])).toBe(1000 + 800 + 800);
  });
  it('charges per-day hospital copays for the assumed days, up to the limit', () => {
    const before = benefits({ hospital: { kind: 'copay', amount: 500, afterDeductible: false, perDayMax: 5 } });
    expect(outOfPocket(before, [member(40, { hospitalStays: 1 })])).toBe(1500);
    const limited = benefits({ hospital: { kind: 'copay', amount: 500, afterDeductible: false, perDayMax: 2 } });
    expect(outOfPocket(limited, [member(40, { hospitalStays: 1 })])).toBe(1000);
  });
  it('charges low-cost first visits before the regular cost share', () => {
    const b = benefits({ introVisits: { count: 2, copay: 1, includesSpecialist: false } });
    expect(outOfPocket(b, [member(40, { primaryVisits: 3, specialistVisits: 1 })])).toBe(1 + 1 + 30 + 60);
  });
  it('counts specialist visits toward shared first visits', () => {
    const b = benefits({
      primary: { kind: 'coinsurance', rate: 0.1 },
      specialist: { kind: 'coinsurance', rate: 0.1 },
      introVisits: { count: 2, copay: 60, includesSpecialist: true },
    });
    expect(outOfPocket(b, [member(40, { primaryVisits: 1, specialistVisits: 1 })])).toBe(120);
  });
  it('stops at the individual limit', () => {
    expect(outOfPocket(benefits(), [member(40, { hospitalStays: 5 })])).toBe(5000);
  });
  it('stops at the family deductible across members', () => {
    const b = benefits({ er: { kind: 'coinsurance', rate: 0 } });
    const members = [member(40, { erVisits: 1 }), member(38, { erVisits: 1 }), member(10, { erVisits: 1 })];
    expect(outOfPocket(b, members)).toBe(2000);
  });
  it('stops at the family limit across members', () => {
    const members = [40, 38, 12].map((age) => member(age, { hospitalStays: 5 }));
    expect(outOfPocket(benefits(), members)).toBe(10000);
  });
});

describe('ongoing care', () => {
  it('adds and removes a need without touching other care', () => {
    const start = member(40, { primaryVisits: 2, specialistVisits: 1 });
    const on = toggleCareNeed(start, 'testNeed');
    expect(on).toMatchObject({ specialistVisits: 2, labTests: 1, diagnosticTests: 1, primaryVisits: 2, careNeeds: ['testNeed'] });
    const off = toggleCareNeed(on, 'testNeed');
    expect(off).toMatchObject({ specialistVisits: 1, labTests: 0, diagnosticTests: 0, careNeeds: [] });
  });
  it('never goes below zero if counts were edited down', () => {
    const on = toggleCareNeed(member(40), 'testNeed');
    expect(toggleCareNeed({ ...on, diagnosticTests: 1 }, 'testNeed').diagnosticTests).toBe(0);
  });
  it('adds self-paid medication to every yearly total, outside the out-of-pocket limit', () => {
    const without = evaluatePlan(plan(), household({ members: [member(21)] }), 0);
    const withDrug = evaluatePlan(plan(), household({ members: [member(21, { selfPayDrugs: { testDrug: 300 } })] }), 0);
    expect(withDrug.selfPayYear).toBe(3600);
    expect(withDrug.expectedYear! - without.expectedYear!).toBe(3600);
    expect(withDrug.badYear! - without.badYear!).toBe(3600);
    expect(withDrug.worstCase! - without.worstCase!).toBe(3600);
    expect(withDrug.oopMax).toBe(without.oopMax);
  });
  it('costs labs, tests, scans, and brand drugs by their own benefits', () => {
    const m = member(40, { labTests: 2, diagnosticTests: 1, brandFills: 1 });
    expect(outOfPocket(benefits(), [m])).toBe(50 + 40 + 70);
    expect(outOfPocket(benefits(), [member(40, { scans: 1 })])).toBe(1000 + 500 * 0.2);
  });
});

describe('over the subsidy limit', () => {
  it('skips the income question and gives no credit', () => {
    const result = estimateSubsidy([plan()], household({ overSubsidyLimit: true, annualIncome: null }));
    expect(result.status).toBe('over-income');
    expect(result.monthlyCredit).toBe(0);
  });
});

describe('hospital networks', () => {
  it('reports each hospital status and filters to required hospitals', () => {
    const inNetwork = plan({ id: 'a', name: 'In', carrier: 'Carrier In' });
    const outOfNetwork = plan({ id: 'b', name: 'Out', carrier: 'Carrier Out' });
    expect(hospitalStatus(inNetwork, 'testHospital')).toBe('in');
    expect(hospitalStatus(outOfNetwork, 'testHospital')).toBe('not-listed');
    expect(hospitalStatus(inNetwork, 'missingHospital')).toBe('unknown');
    const evaluated = [inNetwork, outOfNetwork].map((p) => evaluatePlan(p, household(), 0));
    expect(applyFilters(evaluated, { ...EMPTY_FILTERS, hospitals: ['testHospital'] }).map((p) => p.plan.name)).toEqual(['In']);
    expect(applyFilters(evaluated, EMPTY_FILTERS)).toHaveLength(2);
  });
});

describe('King County data', () => {
  const byName = (name: string) => KING_COUNTY_PLANS.find((p) => p.name === name)!;

  it('loads the expected plans with sources', () => {
    expect(KING_COUNTY_PLANS).toHaveLength(73);
    expect(new Set(KING_COUNTY_PLANS.map((p) => p.id)).size).toBe(73);
    expect(KING_COUNTY_PLANS.filter((p) => !p.benefits).map((p) => p.name).sort()).toEqual([
      'Regence BlueShield Bronze Basic 10K',
      'Regence BlueShield Bronze Essential 9000',
    ]);
    for (const p of KING_COUNTY_PLANS) expect(p.ratesSource).toMatch(/^https:/);
  });

  it('matches published premiums', () => {
    // Premera rate report: Preferred Gold in area 1 at age 42.
    expect(monthlyPremium(byName('Premera Blue Cross Preferred Gold'), [42])).toBeCloseTo(1210.48, 0);
  });

  it('uses the second-lowest exchange Silver plan as the benchmark', () => {
    // CHPW Cascade Select Silver is lowest at $569.71, then Ambetter Cascade Select Silver at $592.68.
    expect(benchmarkPremium(KING_COUNTY_PLANS, household({ members: [member(21)] }))).toBeCloseTo(592.68);
  });

  it('never lets an exchange-only subsidy reach an off-exchange plan', () => {
    const offExchange = byName('Kaiser Permanente VisitsPlus Silver 4500');
    expect(offExchange.channel).toBe('off');
    expect(evaluatePlan(offExchange, household(), 500).creditMonthly).toBe(0);
  });
});

describe('evaluatePlan', () => {
  it('gives no credit for off-exchange plans or direct purchases', () => {
    expect(evaluatePlan(plan({ channel: 'off' }), household(), 50).creditMonthly).toBe(0);
    expect(evaluatePlan(plan({ channel: 'both' }), household(), 50, true).creditMonthly).toBe(0);
    expect(evaluatePlan(plan({ channel: 'both' }), household(), 50).creditMonthly).toBe(50);
  });
  it('never takes the premium below zero', () => {
    expect(evaluatePlan(plan({ basePremium: 10 }), household({ members: [member(21)] }), 500).netMonthly).toBe(0);
  });
  it('leaves yearly costs empty when benefits are unknown', () => {
    const result = evaluatePlan(plan({ benefits: null }), household(), 0);
    expect(result.expectedYear).toBeNull();
    expect(result.netMonthly).toBeGreaterThan(0);
  });
  it('builds worst case from premium plus the out-of-pocket limit', () => {
    const result = evaluatePlan(plan(), household({ members: [member(21)] }), 0);
    expect(result.worstCase).toBeCloseTo(1200 + 5000);
  });
});

describe('filters and sorting', () => {
  const h = household({ members: [member(21)] });
  const plans = [
    evaluatePlan(plan({ id: '1', name: 'Cheap', basePremium: 100, metal: 'bronze', channel: 'off' }), h, 0),
    evaluatePlan(plan({ id: '2', name: 'Mid', basePremium: 200, metal: 'silver', channel: 'both', hsaEligible: true }), h, 0),
    evaluatePlan(plan({ id: '3', name: 'Rich', basePremium: 300, metal: 'gold', channel: 'on' }), h, 0),
  ];
  const names = (list: typeof plans) => list.map((p) => p.plan.name);

  it('filters by metal, buying route, HSA, and price', () => {
    expect(names(applyFilters(plans, { ...EMPTY_FILTERS, metals: ['gold'] }))).toEqual(['Rich']);
    expect(names(applyFilters(plans, { ...EMPTY_FILTERS, route: 'direct' }))).toEqual(['Cheap', 'Mid']);
    expect(names(applyFilters(plans, { ...EMPTY_FILTERS, route: 'exchange' }))).toEqual(['Mid', 'Rich']);
    expect(names(applyFilters(plans, { ...EMPTY_FILTERS, hsaOnly: true }))).toEqual(['Mid']);
    expect(names(applyFilters(plans, { ...EMPTY_FILTERS, maxMonthly: 150 }))).toEqual(['Cheap']);
  });

  it('sorts plans with missing values last in both directions', () => {
    const list = [...plans, evaluatePlan(plan({ id: '4', name: 'Unknown', benefits: null }), h, 0)];
    expect(names(sortPlans(list, 'deductible')).at(-1)).toBe('Unknown');
    expect(names(sortPlans(list, 'deductible', true)).at(-1)).toBe('Unknown');
    expect(names(applyFilters(list, { ...EMPTY_FILTERS, maxDeductible: 999999 }))).not.toContain('Unknown');
  });

  it('sorts in both directions', () => {
    expect(names(sortPlans(plans, 'netMonthly'))).toEqual(['Cheap', 'Mid', 'Rich']);
    expect(names(sortPlans(plans, 'netMonthly', true))).toEqual(['Rich', 'Mid', 'Cheap']);
  });
});
