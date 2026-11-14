import { describe, expect, it } from 'vitest';
import { careSummary, scenarioParts } from './scenarios';
import type { EvaluatedPlan, Member } from './types';

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

  it('splits each total into premiums, care, and cash that add up', () => {
    const item = { premiumYear: 6000, selfPayYear: 1200, careExpected: 500, careBadYear: 3500, oopMax: 9000 } as EvaluatedPlan;
    const rows = scenarioParts(item)!;
    expect(rows.map((r) => [r.id, r.care, r.total])).toEqual([
      ['expected', 500, 7700],
      ['bad', 3500, 10700],
      ['worst', 9000, 16200],
    ]);
    expect(scenarioParts({ ...item, careExpected: null })).toBeNull();
  });
});
