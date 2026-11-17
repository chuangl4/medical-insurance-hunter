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
