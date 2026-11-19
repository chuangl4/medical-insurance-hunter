import { describe, expect, it } from 'vitest';
import { HOSPITAL_IDS, hospitalStatus } from '../data/hospitalNetworks';
import { KING_COUNTY_PLANS } from '../data/kingCounty2027';
import { EMPTY_PROFILE, householdFromProfile } from '../domain/profile';
import { evaluatePlan } from '../domain/calc';
import { planFit } from './PlanCard';

const household = householdFromProfile({ ...EMPTY_PROFILE, members: [{ id: 'm1', label: 'Test', age: 40, careItems: [] }] });
const ctx = { doctors: [], candidates: [], checkingDoctors: [], requiredIds: [...HOSPITAL_IDS], drugLines: [], drugLookup: () => undefined };

describe('unticked must-haves', () => {
  // A real plan that misses at least one tracked hospital, so the test follows the data.
  const missing = KING_COUNTY_PLANS.find((p) => HOSPITAL_IDS.some((id) => hospitalStatus(p, id) !== 'in'));
  it('a plan missing a ticked hospital misses a need', () => {
    expect(missing).toBeDefined();
    const item = evaluatePlan(missing!, household, 0, false, ctx.drugLookup);
    expect(planFit(item, { ...ctx, optionalIds: [] }).overall).toBe('bad');
  });
  it("unticking the hospitals it misses stops that, but the fit line still shows them", () => {
    const item = evaluatePlan(missing!, household, 0, false, ctx.drugLookup);
    const gone = HOSPITAL_IDS.filter((id) => hospitalStatus(missing!, id) !== 'in');
    const fit = planFit(item, { ...ctx, optionalIds: gone });
    expect(fit.overall).not.toBe('bad');
    const hospitals = fit.parts.find((p) => p.key === 'hospitals');
    expect(hospitals).toBeDefined();
    expect(hospitals!.level).not.toBe('good');
  });
});
