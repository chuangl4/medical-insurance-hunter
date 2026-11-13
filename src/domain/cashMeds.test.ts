import { describe, expect, it } from 'vitest';
import { cashActions, cashLines } from './cashMeds';
import { EMPTY_PROFILE, type CareItem } from './profile';

const item = (patch: Partial<CareItem>): CareItem => ({
  id: 'x',
  name: 'Drug A',
  category: 'selfPay',
  perYear: 12,
  monthlyCost: 100,
  notes: '',
  ...patch,
});

describe('medications paid without insurance', () => {
  it('lists only self-pay items with a price, with yearly totals', () => {
    const lines = cashLines({
      ...EMPTY_PROFILE,
      members: [
        {
          id: 'm1',
          label: 'Pat',
          age: 40,
          careItems: [item({ id: 'a' }), item({ id: 'b', monthlyCost: 0 }), item({ id: 'c', category: 'brandFills', monthlyCost: null })],
        },
      ],
    });
    expect(lines.map((l) => [l.item.id, l.person, l.yearly])).toEqual([['a', 'Pat', 1200]]);
  });
  it('suggests steps that fit the reason', () => {
    expect(cashActions('Drug A', 'notOnDrugList').join(' ')).toMatch(/formulary exception/);
    expect(cashActions('Drug A', undefined)).toEqual(cashActions('Drug A', 'notOnDrugList'));
    expect(cashActions('Drug A', 'usuallyNotCovered').join(' ')).not.toMatch(/formulary exception/);
  });
});
