import { describe, expect, it } from 'vitest';
import { KING_COUNTY_PLANS } from '../data/kingCounty2027';
import { MEMBER_SURVEY_NATIONAL_MEDIAN } from '../data/qualityRatings';
import { compareToNation, qualityFor, starsText, surveyScoreText } from './quality';

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


describe('member survey', () => {
  it('calls gaps under 5 points typical', () => {
    const mid = MEMBER_SURVEY_NATIONAL_MEDIAN.customerService;
    expect(compareToNation('customerService', mid + 4)).toBe('typical');
    expect(compareToNation('customerService', mid + 5)).toBe('above');
    expect(compareToNation('customerService', mid - 5)).toBe('below');
    expect(compareToNation('customerService', null)).toBeNull();
  });
  it('shows 0–10 ratings out of 10 and the rest out of 100', () => {
    expect(surveyScoreText('planRating', 69)).toBe('6.9 / 10');
    expect(surveyScoreText('gettingCareQuickly', 64)).toBe('64 / 100');
  });
});
