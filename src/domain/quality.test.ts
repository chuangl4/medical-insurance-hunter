import { describe, expect, it } from 'vitest';
import { KING_COUNTY_PLANS } from '../data/kingCounty2027';
import { qualityFor, starsText } from './quality';

describe('quality ratings', () => {
  it('draws stars', () => {
    expect(starsText(4)).toBe('★★★★☆');
  });
  it('finds a rating by the plan’s insurer ID', () => {
    const plan = { ...KING_COUNTY_PLANS[0], id: '00000WA0000001' };
    expect(qualityFor(plan)).toBeUndefined();
    const rated = KING_COUNTY_PLANS.filter((p) => qualityFor(p));
    expect(rated.length).toBeGreaterThan(0);
    for (const p of rated) expect(qualityFor(p)!.overall === null || (qualityFor(p)!.overall! >= 1 && qualityFor(p)!.overall! <= 5)).toBe(true);
  });
});
