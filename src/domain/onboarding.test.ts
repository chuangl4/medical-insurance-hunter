import { describe, expect, it } from 'vitest';
import { applyChatUpdates, changedParts, checklist, describeChanges, findGaps, nextGaps, NO_UPDATES, subsidyCutoff, type ChatUpdates } from './onboarding';
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
        addItems: [{ memberRef: 'new-1', name: 'Cardiologist', category: 'specialistVisits', perYear: 2, monthlyCost: null, notes: '', cashReason: null, drug: null }],
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
      addItems: [{ memberRef: 'm1', name: 'Generic pill', category: 'genericFills', perYear: 12, monthlyCost: null, notes: '', cashReason: null, drug: null }],
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

  it('keeps a corrected medication linked to its drug, so coverage and scenario choices carry over', () => {
    const drug = { rxcui: '123', name: 'Testolol 5 MG Oral Tablet' };
    const linked: Profile = {
      ...start,
      members: [{ ...start.members[0], careItems: [{ ...start.members[0].careItems[0], name: 'Testolol', drug }] }],
    };
    const u = updates({
      removeItemIds: ['c1'],
      addItems: [
        { memberRef: 'm1', name: 'Testolol eye drops', category: 'selfPay', perYear: 12, monthlyCost: 300, notes: '', cashReason: 'notOnDrugList', drug: null },
        { memberRef: 'm1', name: 'Other pill', category: 'genericFills', perYear: 12, monthlyCost: null, notes: '', cashReason: null, drug: null },
      ],
    });
    const next = applyChatUpdates(linked, u);
    const [kept, other] = next.members[0].careItems;
    expect(describeChanges(linked, next, u)).toEqual([
      'Pat: updated Testolol eye drops (paid without insurance, $300/month)',
      'Pat: Other pill (generic drug fill, 12× a year)',
    ]);
    expect(kept).toMatchObject({ id: 'c1', name: 'Testolol eye drops', category: 'selfPay', monthlyCost: 300, drug });
    expect(other.drug).toBeUndefined();
    expect(other.id).not.toBe('c1');
  });

  it('links medications, records ones not in the drug database, and asks about the rest', () => {
    const drug = { rxcui: '123', name: 'Testolol 5 MG Oral Tablet' };
    const added = applyChatUpdates(
      start,
      updates({
        addItems: [
          { memberRef: 'm1', name: 'Testolol', category: 'brandFills', perYear: 12, monthlyCost: null, notes: '', cashReason: null, drug },
          { memberRef: 'm1', name: 'Compounded cream', category: 'selfPay', perYear: 12, monthlyCost: 40, notes: '', cashReason: 'notOnDrugList', drug: null },
        ],
      }),
    );
    const [unlinked, testolol, cream] = added.members[0].careItems;
    expect(testolol.drug).toEqual(drug);
    // The existing pill and the cream aren't linked, so both are still to confirm.
    expect(findGaps(added).map((g) => g.id)).toEqual(expect.arrayContaining([`drug:${unlinked.id}`, `drug:${cream.id}`]));
    expect(findGaps(added).map((g) => g.id)).not.toContain(`drug:${testolol.id}`);

    const u = updates({ linkItems: [{ itemId: unlinked.id, drug: { rxcui: '456', name: 'Brand pill 10 MG' } }, { itemId: cream.id, drug: null }] });
    const linked = applyChatUpdates(added, u);
    expect(findGaps(linked).some((g) => g.id.startsWith('drug:'))).toBe(false);
    expect(linked.members[0].careItems[2].notInDrugDatabase).toBe(true);
    expect(describeChanges(added, linked, u)).toEqual(['Pat: Brand pill, linked to Brand pill 10 MG', 'Pat: Compounded cream, not in the drug database']);
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
      updates({ addItems: [{ memberRef: 'ghost', name: 'X', category: 'labTests', perYear: 1, monthlyCost: null, notes: '', cashReason: null, drug: null }] }),
    );
    expect(next.members[0].careItems).toHaveLength(1);
  });
});

describe('what a reply changed, for the profile to highlight', () => {
  const base: Profile = {
    ...EMPTY_PROFILE,
    members: [
      {
        id: 'm1',
        label: 'Pat',
        age: 50,
        careItems: [
          { id: 'c1', name: 'Checkup', category: 'primaryVisits', perYear: 1, monthlyCost: null, notes: '' },
          { id: 'c2', name: 'Testolol', category: 'brandFills', perYear: 12, monthlyCost: null, notes: '' },
        ],
      },
    ],
  };

  it('names the edited items and their cards, not the untouched ones', () => {
    const after = { ...base, members: [{ ...base.members[0], careItems: [base.members[0].careItems[0], { ...base.members[0].careItems[1], drug: { rxcui: '1', name: 'testolol' } }] }] };
    expect(changedParts(base, after)).toEqual(['item:c2', 'section:people']);
    expect(changedParts(base, base)).toEqual([]);
  });

  it('points at the person when an item is removed, and at other cards it touched', () => {
    const after = { ...base, inKingCounty: true, annualIncome: 90000, members: [{ ...base.members[0], careItems: [base.members[0].careItems[0]] }] };
    expect(changedParts(base, after).sort()).toEqual(['member:m1', 'section:income', 'section:location', 'section:people']);
  });
});
