import { describe, expect, it } from 'vitest';
import { applyChatUpdates, checklist, describeChanges, findGaps, nextGaps, NO_UPDATES, subsidyCutoff, type ChatUpdates } from './onboarding';
import { EMPTY_PROFILE, type Profile } from './profile';

const updates = (patch: Partial<ChatUpdates>): ChatUpdates => ({ ...NO_UPDATES, ...patch });
const household = (patch: Partial<ChatUpdates['household']>) => updates({ household: { ...NO_UPDATES.household, ...patch } });
const ids = (p: Profile) => findGaps(p).map((g) => g.id.replace(/:.*/, ''));

describe('what the chat still needs', () => {
  it('starts with people, location, providers, and money', () => {
    expect(ids(EMPTY_PROFILE)).toEqual(['people', 'location', 'providers', 'taxHousehold', 'income']);
  });

  it('walks a family through to nothing missing', () => {
    let p = applyChatUpdates(
      EMPTY_PROFILE,
      updates({
        newMembers: [
          { ref: 'new-1', label: 'Me', age: 41 },
          { ref: 'new-2', label: 'Jo', age: null },
        ],
        addItems: [{ memberRef: 'new-1', name: 'Cardiologist', category: 'specialistVisits', perYear: 2, monthlyCost: null, notes: '' }],
        careComplete: ['new-1'],
      }),
    );
    expect(p.taxHouseholdSize).toBe(2);
    expect(p.members[1]).toMatchObject({ label: 'Jo', needsAge: true });
    expect(ids(p)).toEqual(['people', 'age', 'location', 'care', 'providers', 'taxHousehold', 'income']);
    // Volunteered care is kept, but the chat asks only about the household list until it's complete.
    expect(nextGaps(p).map((g) => g.id.replace(/:.*/, ''))).toEqual(['people', 'age']);

    const jo = p.members[1].id;
    p = applyChatUpdates(p, updates({ memberChanges: [{ memberRef: jo, label: null, age: 8 }], rosterComplete: true }));
    expect(describeChanges(p, p, NO_UPDATES)).toEqual([]);
    expect(nextGaps(p).map((g) => g.id.replace(/:.*/, ''))).toEqual(['location', 'care', 'providers', 'taxHousehold', 'income']);
    p = applyChatUpdates(p, updates({ careComplete: [jo] }));
    expect(p.members[1].needsAge).toBeUndefined();
    expect(p.members[1].age).toBe(8);

    p = applyChatUpdates(p, { ...household({ inKingCounty: true, overSubsidyLimit: true }), noMustHaveProviders: true });
    expect(findGaps(p)).toEqual([]);
    expect(checklist(p).every((s) => s.done)).toBe(true);
  });

  it('asks about job-based offers and immigration only while a tax credit is possible', () => {
    const base: Profile = { ...EMPTY_PROFILE, answered: ['taxHousehold'], taxHouseholdSize: 2 };
    const low = applyChatUpdates(base, household({ annualIncome: 50_000 }));
    expect(ids(low)).toContain('employerOffer');
    expect(ids(low)).toContain('immigration');
    const high = applyChatUpdates(base, household({ annualIncome: subsidyCutoff(2) + 1 }));
    expect(ids(high)).not.toContain('employerOffer');
    expect(ids(high)).not.toContain('immigration');
    const answered = applyChatUpdates(low, household({ affordableEmployerOffer: false, immigration: 'citizen' }));
    expect(ids(answered)).not.toContain('employerOffer');
    expect(ids(answered)).not.toContain('immigration');
  });
});

describe('applying chat updates', () => {
  const start: Profile = {
    ...EMPTY_PROFILE,
    members: [
      {
        id: 'm1',
        label: 'Pat',
        age: 45,
        careItems: [{ id: 'c1', name: 'Brand pill', category: 'brandFills', perYear: 12, monthlyCost: null, notes: '' }],
      },
    ],
  };

  it('replaces corrected items, records providers once, and describes the changes', () => {
    const u = updates({
      removeItemIds: ['c1'],
      addItems: [{ memberRef: 'm1', name: 'Generic pill', category: 'genericFills', perYear: 12, monthlyCost: null, notes: '' }],
      providers: [{ name: 'Hospital One', hospitalId: 'h1' }],
    });
    const next = applyChatUpdates(start, u);
    expect(next.members[0].careItems.map((i) => i.name)).toEqual(['Generic pill']);
    expect(next.answered).toContain('providers');
    expect(applyChatUpdates(next, u).providers).toHaveLength(1);
    expect(describeChanges(start, next, u)).toEqual([
      'Pat: Generic pill (generic drug fill, 12× a year)',
      'Pat: removed Brand pill',
      'Must be in network: Hospital One',
    ]);
  });

  it('uses a given income instead of an earlier "above the limit" answer', () => {
    const over = applyChatUpdates(start, household({ overSubsidyLimit: true }));
    expect(over.overSubsidyLimit).toBe(true);
    const withIncome = applyChatUpdates(over, household({ annualIncome: 60_000 }));
    expect(withIncome).toMatchObject({ overSubsidyLimit: false, annualIncome: 60_000 });
  });

  it('ignores updates for unknown people', () => {
    const next = applyChatUpdates(
      start,
      updates({ addItems: [{ memberRef: 'ghost', name: 'X', category: 'labTests', perYear: 1, monthlyCost: null, notes: '' }] }),
    );
    expect(next.members[0].careItems).toHaveLength(1);
  });
});
