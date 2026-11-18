import { describe, expect, it } from 'vitest';
import { approveOnly, coverageLookup, describeEvidence, ifExceptionApproved, listDisagrees, listNote, type DrugCoverage } from './drugs';
import type { Plan } from './types';

const plan = (id: string) => ({ id, carrier: 'Test Insurer' }) as Plan;
const evidence = { kind: 'drug list PDF', url: 'https://example.test/list.pdf', planYear: 2026, row: 'TESTBRAND', asGeneric: true };
const cov: DrugCoverage = {
  checkedAt: 'x',
  source: 'your entries',
  plans: { P1: { covered: true, tier: 'nonPreferredBrand' } },
  fromLists: {
    P1: { covered: false, evidence },
    P2: { covered: true, tier: 'generic', evidence },
  },
};

describe('drug coverage from lists and from you', () => {
  const look = coverageLookup({ '123': cov });
  it('uses your answer first, then the drug list', () => {
    expect(look('123', plan('P1'))).toEqual({ covered: true, tier: 'nonPreferredBrand' });
    expect(look('123', plan('P2'))).toMatchObject({ covered: true, tier: 'generic' });
    expect(look('123', plan('P3'))).toBeUndefined();
  });
  it('flags where your answer and the list disagree', () => {
    expect(listDisagrees(cov, 'P1')).toBe(true);
    expect(listDisagrees(cov, 'P2')).toBe(false);
  });
  it('explains where a list answer came from', () => {
    expect(listNote(look('123', plan('P2')))).toBe('from drug list, as generic, 2026 list');
    expect(listNote(look('123', plan('P1')))).toBe('your answer');
    expect(describeEvidence('Test Insurer (Brand)', evidence)).toBe(
      'Test Insurer\'s 2026 drug list (PDF); row "TESTBRAND"; covered as the generic; the 2027 list isn\'t posted yet',
    );
  });
});


describe('exceptions and restrictions', () => {
  it('prices a drug a plan does not list as if an exception were approved', () => {
    const base = coverageLookup({ '9': { checkedAt: '', source: '', plans: { P1: { covered: false }, P2: { covered: true, tier: 'generic' } } } });
    const approved = ifExceptionApproved(base);
    expect(approved('9', plan('P1'))).toEqual({ covered: true, tier: 'nonPreferredBrand' });
    expect(approved('9', plan('P2'))).toEqual({ covered: true, tier: 'generic' });
  });
  it('approves one drug at a time, leaving the others as they are', () => {
    const base = coverageLookup({
      '9': { checkedAt: '', source: '', plans: { P1: { covered: false } } },
      '8': { checkedAt: '', source: '', plans: { P1: { covered: false } } },
    });
    const onlyNine = approveOnly(base, '9');
    expect(onlyNine('9', plan('P1'))).toEqual({ covered: true, tier: 'nonPreferredBrand' });
    expect(onlyNine('8', plan('P1'))).toEqual({ covered: false });
  });
  it("adds the list's prior authorization to your matching answer", () => {
    const look = coverageLookup({
      '9': {
        checkedAt: '',
        source: '',
        plans: { P1: { covered: true, tier: 'nonPreferredBrand' } },
        fromLists: { P1: { covered: true, tier: 'nonPreferredBrand', restrictions: ['priorAuth'], evidence } },
      },
    });
    expect(look('9', plan('P1'))).toEqual({ covered: true, tier: 'nonPreferredBrand', restrictions: ['priorAuth'] });
  });
});
