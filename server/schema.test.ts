import { describe, expect, it } from 'vitest';
import { profileSchema } from './schema';
import { isCandidate } from '../src/domain/profile';

const base = {
  version: 1,
  members: [],
  taxHouseholdSize: 1,
  annualIncome: null,
  overSubsidyLimit: false,
  filingStatus: 'single',
  immigration: 'citizen',
  affordableEmployerOffer: false,
};

describe('candidate doctors', () => {
  it('saves a candidate with its insurer and note', () => {
    const parsed = profileSchema.parse({
      ...base,
      providers: [{ id: 'p1', name: 'Dr. Test Person', hospitalId: null, candidateFor: 'Test Insurer', note: 'Eye care, Testville' }],
    });
    expect(parsed.providers?.[0]).toMatchObject({ candidateFor: 'Test Insurer', note: 'Eye care, Testville' });
    expect(isCandidate(parsed.providers![0])).toBe(true);
    expect(isCandidate({ id: 'p2', name: 'Dr. Must Have', hospitalId: null })).toBe(false);
  });
  it('rejects an overly long note', () => {
    expect(() =>
      profileSchema.parse({ ...base, providers: [{ id: 'p1', name: 'Dr. X', hospitalId: null, candidateFor: 'X', note: 'n'.repeat(161) }] }),
    ).toThrow();
  });
});

describe('your scenario', () => {
  const scenario = { listedCare: 1, hospitalStays: 1, erVisits: 0, majorBill: 0, forMember: 'm1', approved: ['123'], stopped: [] };
  it('saves a scenario with the profile', () => {
    expect(profileSchema.parse({ ...base, scenario }).scenario).toEqual(scenario);
  });
  it('rejects values the controls never produce', () => {
    expect(() => profileSchema.parse({ ...base, scenario: { ...scenario, listedCare: 3 } })).toThrow();
    expect(() => profileSchema.parse({ ...base, scenario: { ...scenario, hospitalStays: -1 } })).toThrow();
    expect(() => profileSchema.parse({ ...base, scenario: { ...scenario, approved: ['not-an-id'] } })).toThrow();
  });
});
