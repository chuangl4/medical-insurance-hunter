import { describe, expect, it } from 'vitest';
import { toOptions } from './drugs';

describe('RxNorm options', () => {
  it('keeps branded and generic products with a strength, and marks brands', () => {
    const options = toOptions({
      drugGroup: {
        conceptGroup: [
          { tty: 'BN', conceptProperties: [{ rxcui: '1', name: 'Testbrand' }] },
          { tty: 'SBD', conceptProperties: [{ rxcui: '2', name: 'testdrug 1 MG/ML Ophthalmic Solution [Testbrand]' }] },
          { tty: 'SCD', conceptProperties: [{ rxcui: '3', name: 'testdrug 1 MG/ML Ophthalmic Solution' }] },
        ],
      },
    });
    expect(options).toEqual([
      { rxcui: '3', name: 'testdrug 1 MG/ML Ophthalmic Solution', brand: false },
      { rxcui: '2', name: 'testdrug 1 MG/ML Ophthalmic Solution [Testbrand]', brand: true },
    ]);
  });

  it('puts plain products before combinations, generic first, pills first, lowest strength first', () => {
    const data = {
      drugGroup: {
        conceptGroup: [
          { tty: 'SBD', conceptProperties: [{ rxcui: '1', name: 'testdrug 80 MG Oral Tablet [Testbrand]' }, { rxcui: '2', name: 'otherdrug 5 MG / testdrug 10 MG Oral Tablet [Combobrand]' }] },
          { tty: 'SCD', conceptProperties: [{ rxcui: '3', name: 'testdrug 20 MG / thirddrug 10 MG Oral Tablet' }, { rxcui: '4', name: 'testdrug 80 MG Oral Tablet' }, { rxcui: '5', name: 'testdrug 4 MG/ML Oral Suspension' }, { rxcui: '6', name: 'testdrug 10 MG Oral Tablet' }] },
        ],
      },
    };
    expect(toOptions(data, 'testdrug').map((o) => o.rxcui)).toEqual(['6', '4', '5', '1', '3', '2']);
    // Searching the brand name puts the brand first.
    expect(toOptions(data, 'testbrand')[0].rxcui).toBe('1');
  });
});
