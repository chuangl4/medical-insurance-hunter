import { describe, expect, it } from 'vitest';
import { EMPTY_PROFILE, householdFromProfile, inSetup, memberForCalc, profileFromLegacy, type ProfileMember } from './profile';

const person = (careItems: ProfileMember['careItems']): ProfileMember => ({ id: 'p1', label: 'Pat', age: 45, careItems });
const item = (category: ProfileMember['careItems'][number]['category'], perYear: number, monthlyCost: number | null = null) => ({
  id: `${category}-${perYear}`,
  name: 'Care',
  category,
  perYear,
  monthlyCost,
  notes: '',
});

describe('profile care lists', () => {
  it('adds up items into the counts the calculator uses', () => {
    const m = memberForCalc(person([item('specialistVisits', 2), item('specialistVisits', 1), item('brandFills', 12), item('scans', 1)]));
    expect(m).toMatchObject({ specialistVisits: 3, brandFills: 12, scans: 1, primaryVisits: 0, selfPayDrugs: {} });
  });
  it('treats self-pay items as monthly cash costs, not visits', () => {
    const m = memberForCalc(person([item('selfPay', 12, 300), item('selfPay', 12, 0)]));
    expect(m.selfPayDrugs).toEqual({ 'selfPay-12': 300 });
    expect(m.genericFills).toBe(0);
  });
  it('carries household settings through', () => {
    const h = householdFromProfile({ ...EMPTY_PROFILE, members: [person([])], overSubsidyLimit: true, taxHouseholdSize: 3 });
    expect(h).toMatchObject({ county: 'King', overSubsidyLimit: true, taxHouseholdSize: 3 });
    expect(h.members).toHaveLength(1);
  });
});

describe('moving a browser-saved household into an account', () => {
  it('keeps every count and self-paid drug as an item', () => {
    const profile = profileFromLegacy(
      {
        overSubsidyLimit: true,
        taxHouseholdSize: 2,
        members: [{ id: 'm1', label: 'A', age: 50, primaryVisits: 2, labTests: 1, selfPayDrugs: { drugX: 120 } }],
      },
      { drugX: 'Drug X' },
    );
    expect(profile.overSubsidyLimit).toBe(true);
    const items = profile.members[0].careItems;
    expect(items.map((i) => [i.category, i.perYear])).toEqual([
      ['primaryVisits', 2],
      ['labTests', 1],
      ['selfPay', 12],
    ]);
    expect(items[2]).toMatchObject({ name: 'Drug X', monthlyCost: 120 });
    expect(memberForCalc(profile.members[0])).toMatchObject({ primaryVisits: 2, labTests: 1 });
  });
});

describe('first-time setup', () => {
  const someone = { id: 'm1', label: 'Test', age: 40, careItems: [] };
  it('is on for a new, empty profile', () => expect(inSetup(EMPTY_PROFILE)).toBe(true));
  it('stays on until setup is finished, even with people added', () =>
    expect(inSetup({ ...EMPTY_PROFILE, members: [someone], setupDone: false })).toBe(true));
  it('is off for profiles saved before setup was tracked', () => expect(inSetup({ ...EMPTY_PROFILE, members: [someone] })).toBe(false));
  it('is off once finished', () => expect(inSetup({ ...EMPTY_PROFILE, members: [someone], setupDone: true })).toBe(false));
  it('comes back if everyone is removed', () => expect(inSetup({ ...EMPTY_PROFILE, setupDone: true })).toBe(true));
});
