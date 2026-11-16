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
      { rxcui: '2', name: 'testdrug 1 MG/ML Ophthalmic Solution [Testbrand]', brand: true },
      { rxcui: '3', name: 'testdrug 1 MG/ML Ophthalmic Solution', brand: false },
    ]);
  });
});
