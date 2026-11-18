import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENARIO, PRESETS, applyScenario, careSummary, presetOf, scenarioParts, scenarioSummary, type CareScenario } from './scenarios';
import type { EvaluatedPlan, Household, Member } from './types';

const member = (patch: Partial<Member>): Member => ({
  id: 'm', label: 'Pat', age: 40, primaryVisits: 0, specialistVisits: 0, genericFills: 0, brandFills: 0, labTests: 0,
  diagnosticTests: 0, scans: 0, erVisits: 0, hospitalStays: 0, selfPayDrugs: {}, ...patch,
});

describe('scenario explanations', () => {
  it('summarizes the household care in words', () => {
    expect(careSummary([member({ specialistVisits: 2, labTests: 1 }), member({ specialistVisits: 1, genericFills: 12 })])).toBe(
      '3 specialist visits, 1 lab test and 12 generic fills',
    );
    expect(careSummary([member({})])).toBe('no care listed yet');
  });

  it('splits your scenario and the worst case into premiums, care, and cash that add up', () => {
    const item = {
      premiumYear: 6000,
      selfPayYear: 1200,
      uncoveredDrugsYear: 900,
      careScenario: 500,
      oopMax: 9000,
      drugCosts: { a: { kind: 'plan', yearly: 120, runs: [] }, b: { kind: 'cash', yearly: 900, runs: [] } },
    } as unknown as EvaluatedPlan;
    const [scenario, worst] = scenarioParts(item)!;
    expect([scenario.total, scenario.coveredDrugs, scenario.uncoveredDrugs, scenario.alwaysCash]).toEqual([7700, 120, 900, 300]);
    expect([worst.total, worst.coveredDrugs]).toEqual([16200, null]);
    expect(scenarioParts({ ...item, careScenario: null })).toBeNull();
  });
});

describe('your scenario', () => {
  const household: Household = {
    county: 'King', taxHouseholdSize: 2, annualIncome: null, overSubsidyLimit: true, filingStatus: 'joint', immigration: 'citizen', affordableEmployerOffer: false,
    members: [
      member({ id: 'a', specialistVisits: 4, labTests: 2, selfPayDrugs: { cream: 40 }, drugs: [{ itemId: 'd', name: 'Testdrug', rxcui: '1', price: 100, fillsPerYear: 12, assume: 'brand' }] }),
      member({ id: 'b', primaryVisits: 2 }),
    ],
  };

  it('starts as listed care only', () => {
    expect(presetOf(DEFAULT_SCENARIO)).toBe('listed');
    expect(applyScenario(household, DEFAULT_SCENARIO)).toEqual(household);
  });

  it('scales listed visits, adds unplanned care for the chosen person, and leaves out stopped medications', () => {
    const s: CareScenario = { ...DEFAULT_SCENARIO, listedCare: 0.5, hospitalStays: 1, forMember: 'b', stopped: ['cream', 'd'] };
    const [a, b] = applyScenario(household, s).members;
    expect([a.specialistVisits, a.labTests, a.hospitalStays, a.selfPayDrugs, a.drugs]).toEqual([2, 1, 0, {}, []]);
    expect([b.primaryVisits, b.hospitalStays]).toEqual([1, 1]);
    expect(presetOf(s)).toBeNull();
  });

  it('recognizes presets whatever the medication choices', () => {
    const stay = PRESETS.find((p) => p.id === 'stay')!;
    expect(presetOf({ ...DEFAULT_SCENARIO, ...stay.care, approved: ['1'] })).toBe('stay');
  });

  it('describes itself in one line', () => {
    const s = { ...DEFAULT_SCENARIO, hospitalStays: 1, approved: ['1'] };
    expect(scenarioSummary(s, [{ id: 'a', label: 'Pat' }], { '1': 'Testdrug' })).toBe('your listed care + 1 hospital stay for Pat · Testdrug approved where not listed');
  });
});
