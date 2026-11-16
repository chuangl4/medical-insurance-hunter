import { describe, expect, it } from 'vitest';
import { compactFromCms, lookupCoverage, matchRow, tierFromName } from './formularyData';

const plan = (plan_id: string, drug_tier: string, extra = {}) => ({ plan_id, drug_tier, years: [2027], ...extra });

describe('drug files in the common format', () => {
  it('maps insurers\' tier names to the app tiers', () => {
    expect(tierFromName('PREFERRED-BRAND')).toBe('preferredBrand');
    expect(tierFromName('NON-PREFERREDGENERIC-NON-PREFERREDBRAND')).toBe('nonPreferredBrand');
    expect(tierFromName('ZEROCOSTSHAREPREVENTIVEDRUGS')).toBe('preventive');
    expect(tierFromName('MYSTERY-TIER')).toBeUndefined();
  });

  const files = [
    [
      { rxnorm_id: '111', plans: [plan('P1', 'GENERIC', { prior_authorization: true }), plan('OTHER', 'GENERIC'), { ...plan('P2', 'GENERIC'), years: [2026] }] },
      { rxnorm_id: '222', plans: [plan('P2', 'PREFERRED-BRAND'), plan('P1', 'ODD')] },
    ],
  ];
  const { formulary, unknownTiers } = compactFromCms(files, { carrier: 'Test Insurer', sourceUrl: 'https://example.test/drugs.json', planIds: ['P1', 'P2', 'P3'], planYear: 2027, builtAt: 'now' });

  it('keeps only the app\'s plans for the year, and reports unknown tiers', () => {
    expect(formulary.planIds).toEqual(['P1', 'P2']);
    expect(formulary.drugs).toEqual({ '111': [[0, 'generic', 1]], '222': [[1, 'preferredBrand', 0]] });
    expect(unknownTiers).toEqual({ ODD: 1 });
  });

  it('marks listed plans that leave a drug out as not covered, and prefers an exact match', () => {
    const r = lookupCoverage([formulary], ['111', '222']);
    expect(r.P1).toMatchObject({ covered: true, tier: 'generic', restrictions: ['priorAuth'], matchedRxcui: '111' });
    expect(r.P2).toMatchObject({ covered: true, tier: 'preferredBrand', matchedRxcui: '222' });
    expect(lookupCoverage([formulary], ['999']).P1).toMatchObject({ covered: false });
    expect(r.P3).toBeUndefined();
  });
});


describe('matching printed drug-list rows', () => {
  const rows: [string, 'generic' | 'preferredBrand' | 'nonPreferredBrand', number][] = [
    ['amlodipine-benazepril oral capsule', 'generic', 0],
    ['testolol oral tablet 10 mg', 'generic', 0],
    ['testolol ophth soln 0.5%', 'nonPreferredBrand', 1],
    ['TESTBRAND OPHTHALMIC SOLUTION 0.5% (testolol)', 'preferredBrand', 0],
  ];
  const eyeDrop = { name: 'testolol 5 MG/ML Ophthalmic Solution [Testbrand]', brand: true, ingredients: ['testolol'], brands: ['Testbrand'] };

  it('prefers the brand row for a brand drug, in the same form', () => {
    expect(matchRow(rows, eyeDrop)).toEqual({ row: rows[3], asGeneric: false });
  });
  it('covers a brand as its generic when only the generic is listed, never a different form', () => {
    expect(matchRow(rows.slice(0, 3), eyeDrop)).toEqual({ row: rows[2], asGeneric: true });
    expect(matchRow(rows.slice(0, 2), eyeDrop)).toBeNull();
  });
  it('matches generic and combination drugs by ingredient', () => {
    expect(matchRow(rows, { name: 'testolol 10 MG Oral Tablet', brand: false, ingredients: ['testolol'], brands: [] })?.row).toBe(rows[1]);
    expect(matchRow(rows, { name: 'amlodipine 5 MG / benazepril 10 MG Oral Capsule', brand: false, ingredients: ['amlodipine', 'benazepril'], brands: [] })?.row).toBe(rows[0]);
  });
});
