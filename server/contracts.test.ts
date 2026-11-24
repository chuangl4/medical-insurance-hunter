import { describe, expect, it } from 'vitest';
import type { Plan } from '../src/domain/types';
import { tierName, verifyContract } from './contracts';

const plan = {
  name: 'Testco Cascade Complete Gold',
  benefits: { deductible: { individual: 1700, family: 3400 }, oopMax: { individual: 7000, family: 14000 } },
} as unknown as Pick<Plan, 'name' | 'benefits'>;

const pages = ['Testco Cascade Complete Gold', 'Plan year 2027. Deductible: $1,700 per person.', 'Out-of-pocket maximum $ 7,000'];

describe('checking a downloaded contract', () => {
  it('reads the tier part of a plan name', () => {
    expect(tierName({ name: 'Testco Cascade Select Vital Gold' })).toBe('Cascade Select Vital Gold');
    expect(tierName({ name: 'Testco Secure Care 5' })).toBe('Secure Care 5');
  });

  it("passes the plan's own 2027 contract", () => {
    expect(verifyContract(pages, plan)).toEqual([]);
  });

  it('flags the wrong year, tier or costs', () => {
    expect(verifyContract(pages.map((p) => p.replace('2027', '2026')), plan)).toEqual(['does not mention 2027']);
    expect(verifyContract(pages.map((p) => p.replace('Complete Gold', 'Silver')), plan)).toEqual(['does not mention "Cascade Complete Gold"']);
    expect(verifyContract(pages.map((p) => p.replace('1,700', '1,000')), plan)).toEqual(['deductible $1,700 not found']);
    expect(verifyContract(pages.map((p) => p.replace('7,000', '9,200')), plan)).toEqual(['out-of-pocket maximum $7,000 not found']);
  });

  it('takes the year from the address only when told to, and still checks the costs', () => {
    const undated = pages.map((p) => p.replace('2027', '[Eff Date]'));
    expect(verifyContract(undated, plan, { yearFromAddress: true })).toEqual([]);
    expect(verifyContract(undated.map((p) => p.replace('1,700', '1,000')), plan, { yearFromAddress: true })).toEqual(['deductible $1,700 not found']);
  });

  it('checks a shared contract by year and product name only', () => {
    expect(verifyContract(['Testco Cascade Select 2027'], plan, { sharedName: 'Cascade Select' })).toEqual([]);
    expect(verifyContract(['Testco 2027'], plan, { sharedName: 'Cascade Select' })).toEqual(['does not mention "Cascade Select"']);
  });
});
