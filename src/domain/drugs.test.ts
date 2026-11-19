import { describe, expect, it } from 'vitest';
import { approveAll, coverageLookup, drugCostText, fillCostText, describeEvidence, ifExceptionApproved, listDisagrees, listNote, pickDrug, type DrugCoverage } from './drugs';
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
  it('approves only the drugs you assume approved', () => {
    const base = coverageLookup({
      '9': { checkedAt: '', source: '', plans: { P1: { covered: false } } },
      '8': { checkedAt: '', source: '', plans: { P1: { covered: false } } },
    });
    const onlyNine = approveAll(base, ['9']);
    expect(onlyNine('9', plan('P1'))).toEqual({ covered: true, tier: 'nonPreferredBrand' });
    expect(onlyNine('8', plan('P1'))).toEqual({ covered: false });
  });
  it('writes out the fills behind a yearly drug cost', () => {
    expect(
      drugCostText({
        kind: 'plan',
        yearly: 3450,
        runs: [
          { count: 9, paid: 300, phase: 'deductible' },
          { count: 1, paid: 300, phase: 'meetsDeductible' },
          { count: 2, paid: 225, phase: 'afterDeductible' },
        ],
      }),
    ).toBe('9 × $300 (full price, toward the deductible) + 1 × $300 (meets the deductible) + 2 × $225 (after the deductible) = $3,450');
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

describe('what one fill costs', () => {
  it('charges a plain copay from the first fill', () => {
    expect(fillCostText({ kind: 'copay', amount: 100, afterDeductible: false }, 300, 1700)).toBe('$100 per fill from the first fill');
  });
  it('puts the deductible first for an after-deductible copay', () => {
    expect(fillCostText({ kind: 'copay', amount: 250, afterDeductible: true }, 300, 2800)).toBe(
      'full price ($300) until the $2,800 deductible is met, then $250 per fill',
    );
  });
  it('shows coinsurance as a share and an amount', () => {
    expect(fillCostText({ kind: 'coinsurance', rate: 0.4 }, 300, 7000)).toBe('full price ($300) until the $7,000 deductible is met, then 40% ($120) per fill');
  });
  it('caps a copay at the price', () => {
    expect(fillCostText({ kind: 'copay', amount: 75, afterDeductible: false }, 40, 2800)).toBe('full price ($40) per fill, since the $75 copay is more');
  });
});

describe('matching a typed medication to search results', () => {
  const opt = (rxcui: string, name: string) => ({ rxcui, name, brand: name.includes('[') });
  const options = [
    opt('1', 'atorvastatin 10 MG Oral Tablet'),
    opt('2', 'atorvastatin 20 MG Oral Tablet'),
    opt('3', 'atorvastatin 20 MG Oral Tablet [Lipitor]'),
    opt('4', 'atorvastatin 120 MG Oral Tablet'),
  ];

  it('links the one product that fits the strength and brand typed', () => {
    expect(pickDrug('Lipitor 20 mg', options).match?.rxcui).toBe('3');
    expect(pickDrug('atorvastatin 20mg daily', options).match?.rxcui).toBe('2');
  });

  it('offers choices when the name alone fits several', () => {
    const { match, choices } = pickDrug('atorvastatin', options);
    expect(match).toBeNull();
    expect(choices.map((c) => c.rxcui)).toEqual(['1', '2', '4']);
  });

  it('keeps everything when a strength matches nothing', () => {
    expect(pickDrug('atorvastatin 5 mg', options).choices).toHaveLength(3);
  });
});
