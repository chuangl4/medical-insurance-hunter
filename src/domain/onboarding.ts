import { povertyLine } from './calc';
import type { DrugRef } from './drugs';
import { CATEGORY_LABELS, MEDICATION_CATEGORIES, needsDrugLink, newId, type AnswerKey, type CareItem, type Profile, type ProfileMember } from './profile';
import { MAX_SUBSIDY_FPL, PLAN_YEAR } from './rules2027';
import type { FilingStatus, ImmigrationStatus } from './types';

/**
 * What the app needs before it can rank plans well, and why:
 * - each person's age on January 1 sets their premium;
 * - plan data only covers King County;
 * - each person's expected care drives the yearly cost estimate;
 * - must-have hospitals and doctors rule plans in or out;
 * - income, tax household, job-based coverage offers, and immigration status decide the premium tax credit,
 *   so they're only asked while a credit is still possible.
 */
export interface Gap {
  id: string;
  /** Short name for the checklist. */
  label: string;
  /** What to ask for, written for the chat assistant. */
  ask: string;
}

const nameOf = (m: ProfileMember) => m.label.trim() || 'this person';
const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** Income above which no premium tax credit is available. */
export const subsidyCutoff = (taxHouseholdSize: number) => (povertyLine(taxHouseholdSize) * MAX_SUBSIDY_FPL) / 100;

/** Whether a premium tax credit is still possible, so the remaining money questions matter. */
export function subsidyStillPossible(profile: Profile): boolean {
  if (profile.overSubsidyLimit) return false;
  return profile.annualIncome === null || profile.annualIncome <= subsidyCutoff(profile.taxHouseholdSize);
}

/** Information still missing, in the order it's best asked. */
export function findGaps(profile: Profile): Gap[] {
  const gaps: Gap[] = [];
  const answered = new Set(profile.answered ?? []);

  if (profile.members.length === 0 || !answered.has('roster')) {
    gaps.push({
      id: 'people',
      label: 'Who needs coverage',
      ask: `The household list: how many people need coverage in ${PLAN_YEAR}, then each person's first name and age on January 1, ${PLAN_YEAR}. If someone is described only by role ("me", "my wife"), ask for their first name; a role is fine if they'd rather not say. Set rosterComplete once the user confirms that's everyone, for example when the names given match the number they said, or they say that's all.`,
    });
  }
  for (const m of profile.members) {
    if (m.needsAge) {
      gaps.push({
        id: `age:${m.id}`,
        label: `${nameOf(m)}'s age`,
        ask: `${nameOf(m)}'s age on January 1, ${PLAN_YEAR} (member ${m.id}). It sets their premium.`,
      });
    }
  }
  if (profile.inKingCounty === undefined) {
    gaps.push({
      id: 'location',
      label: 'Where you live',
      ask: 'Whether they live in King County, Washington, the only county with plan data. A city or ZIP code is enough.',
    });
  }
  for (const m of profile.members) {
    if (!m.careReviewed) {
      gaps.push({
        id: `care:${m.id}`,
        label: `${nameOf(m)}'s care`,
        ask: `The care ${nameOf(m)} (member ${m.id}) expects next year: regular and specialist doctors, prescriptions (name, how often, generic or brand), lab work, tests and scans, therapy, and any planned surgery, pregnancy, or hospital stay. Mark it complete once they confirm nothing else is coming, including "nothing".`,
      });
    }
    for (const item of m.careItems.filter(needsDrugLink)) {
      gaps.push({
        id: `drug:${item.id}`,
        label: `Confirm ${item.name}`,
        ask: `Which drug ${nameOf(m)}'s "${item.name}" (item ${item.id}) is, so each plan's drug list can be checked: look it up with searchDrugs, then link it with linkItems, or ask the user to choose or correct the name. If they say it isn't a standard drug (compounded, for example), set linkItems with rxcui null.`,
      });
    }
  }
  if (!answered.has('providers')) {
    gaps.push({
      id: 'providers',
      label: 'Must-have doctors and hospitals',
      ask: 'Any hospitals, clinics, or doctors that must be in network, or that they have none.',
    });
  }
  if (!profile.overSubsidyLimit) {
    if (!answered.has('taxHousehold')) {
      gaps.push({
        id: 'taxHousehold',
        label: 'Tax household',
        ask: 'How they will file taxes for the year (single or head of household, married filing jointly, or married filing separately) and how many people will be on the tax return, including dependents who do not need this coverage.',
      });
    }
    if (profile.annualIncome === null) {
      gaps.push({
        id: 'income',
        label: 'Income',
        ask: `Expected ${PLAN_YEAR} household income (modified adjusted gross income; a round number is fine), or simply that it is above the subsidy limit, about ${dollars(subsidyCutoff(profile.taxHouseholdSize))} for a tax household of ${profile.taxHouseholdSize}.`,
      });
    } else if (subsidyStillPossible(profile)) {
      if (!answered.has('employerOffer')) {
        gaps.push({
          id: 'employerOffer',
          label: 'Job-based coverage offers',
          ask: 'Whether anyone who needs coverage has been offered job-based health coverage they could afford. It usually rules out a premium tax credit for them.',
        });
      }
      if (!answered.has('immigration')) {
        gaps.push({
          id: 'immigration',
          label: 'Immigration status',
          ask: 'Whether everyone is a U.S. citizen or national, a lawful permanent resident (or Cuban-Haitian Entrant or COFA migrant), or something else. From 2027 it decides who can get federal help with premiums.',
        });
      }
    }
  }
  return gaps;
}

const isRosterGap = (gap: Gap) => gap.id === 'people' || gap.id.startsWith('age:');

/**
 * What the chat should ask about next. The household list (how many people, names, and ages) comes first:
 * nothing else is asked until it's complete, though anything volunteered is still recorded.
 */
export function nextGaps(profile: Profile): Gap[] {
  const gaps = findGaps(profile);
  return gaps.some(isRosterGap) ? gaps.filter(isRosterGap) : gaps;
}

/** Checklist sections shown beside the chat. */
export interface ChecklistStep {
  label: string;
  done: boolean;
}

export function checklist(profile: Profile): ChecklistStep[] {
  const open = new Set(findGaps(profile).map((g) => g.id));
  const has = (prefix: string) => [...open].some((id) => id.startsWith(prefix));
  return [
    { label: 'Who needs coverage', done: !open.has('people') && !has('age:') },
    { label: 'Where you live', done: !open.has('location') },
    ...profile.members.map((m) => ({
      label: `${nameOf(m)}'s care`,
      done: !open.has(`care:${m.id}`) && !m.careItems.some((i) => open.has(`drug:${i.id}`)),
    })),
    ...(profile.members.length ? [] : [{ label: 'Everyone\'s care', done: false }]),
    { label: 'Must-have doctors and hospitals', done: !open.has('providers') },
    { label: 'Income and subsidies', done: !['taxHousehold', 'income', 'employerOffer', 'immigration'].some((id) => open.has(id)) },
  ];
}

/** Changes the chat assistant proposes from one message. People are referred to by member id or a new ref. */
export interface ChatUpdates {
  newMembers: { ref: string; label: string; age: number | null }[];
  memberChanges: { memberRef: string; label: string | null; age: number | null }[];
  addItems: (Omit<CareItem, 'id' | 'cashReason' | 'drug' | 'notInDrugDatabase'> & {
    memberRef: string;
    cashReason: CareItem['cashReason'] | null;
    /** The medication's drug database entry, from a search Scout ran for this reply; null when not linked. */
    drug: DrugRef | null;
  })[];
  removeItemIds: string[];
  /** Links an existing medication to its drug database entry, or, with drug null, records that it isn't in the database. */
  linkItems: { itemId: string; drug: DrugRef | null }[];
  /** People whose care list the user confirmed is complete. */
  careComplete: string[];
  /** The user confirmed the list of people needing coverage is complete. */
  rosterComplete: boolean;
  household: {
    inKingCounty: boolean | null;
    overSubsidyLimit: boolean | null;
    annualIncome: number | null;
    taxHouseholdSize: number | null;
    filingStatus: FilingStatus | null;
    immigration: ImmigrationStatus | null;
    affordableEmployerOffer: boolean | null;
  };
  providers: { name: string; hospitalId: string | null }[];
  noMustHaveProviders: boolean;
}

export const NO_UPDATES: ChatUpdates = {
  newMembers: [],
  memberChanges: [],
  addItems: [],
  removeItemIds: [],
  linkItems: [],
  careComplete: [],
  rosterComplete: false,
  household: {
    inKingCounty: null,
    overSubsidyLimit: null,
    annualIncome: null,
    taxHouseholdSize: null,
    filingStatus: null,
    immigration: null,
    affordableEmployerOffer: null,
  },
  providers: [],
  noMustHaveProviders: false,
};

const firstWord = (name: string) => name.trim().toLowerCase().split(/[^a-z0-9]+/)[0] ?? '';

/**
 * Scout corrects a care item by removing it and adding a new one. For a medication linked to the drug database, the
 * corrected one keeps the old one's id, link and price, so its plan-by-plan coverage and your scenario choices (which
 * are keyed by both) carry over instead of quietly dropping out.
 */
function carryOver(item: CareItem, replaced: CareItem[]): CareItem {
  if (!MEDICATION_CATEGORIES.includes(item.category)) return item;
  const word = firstWord(item.name);
  const index = replaced.findIndex((old) => old.drug && word && (firstWord(old.name) === word || firstWord(old.drug.name) === word));
  if (index < 0) return item;
  const [old] = replaced.splice(index, 1);
  return { ...item, id: old.id, drug: item.drug ?? old.drug, monthlyCost: item.monthlyCost ?? old.monthlyCost, notes: item.notes || old.notes };
}

/** A link Scout set on an existing medication: linked to a drug, or marked as not in the drug database. */
function linked(item: CareItem, drug: DrugRef | null): CareItem {
  if (!MEDICATION_CATEGORIES.includes(item.category)) return item;
  const { notInDrugDatabase: _flag, drug: _drug, ...rest } = item;
  return drug ? { ...rest, drug } : { ...rest, notInDrugDatabase: true };
}

/** Applies chat updates. Anything pointing at an unknown person or item is ignored. */
export function applyChatUpdates(profile: Profile, u: ChatUpdates): Profile {
  const refToId = new Map(profile.members.map((m) => [m.id, m.id]));
  const added: ProfileMember[] = u.newMembers.map((m) => {
    const id = newId('member');
    refToId.set(m.ref, id);
    return m.age === null ? { id, label: m.label, age: 30, careItems: [], needsAge: true } : { id, label: m.label, age: m.age, careItems: [] };
  });
  const changes = new Map(u.memberChanges.map((c) => [refToId.get(c.memberRef), c]));
  const complete = new Set(u.careComplete.map((ref) => refToId.get(ref)));
  const removed = new Set(u.removeItemIds);
  const links = new Map(u.linkItems.map((l) => [l.itemId, l.drug]));

  const members = [...profile.members, ...added].map((member): ProfileMember => {
    const { needsAge, ...rest } = member;
    const change = changes.get(member.id);
    const replaced = member.careItems.filter((item) => removed.has(item.id) && item.drug);
    const next: ProfileMember = {
      ...rest,
      label: change?.label || member.label,
      age: change?.age ?? member.age,
      careItems: [
        ...member.careItems.filter((item) => !removed.has(item.id)).map((item) => (links.has(item.id) ? linked(item, links.get(item.id)!) : item)),
        ...u.addItems
          .filter((item) => refToId.get(item.memberRef) === member.id)
          .map(({ memberRef: _ref, cashReason, drug, ...item }): CareItem =>
            carryOver(
              {
                ...item,
                id: newId('care'),
                ...(item.category === 'selfPay' && cashReason ? { cashReason } : {}),
                ...(drug && MEDICATION_CATEGORIES.includes(item.category) ? { drug } : {}),
              },
              replaced,
            ),
          ),
      ],
    };
    if (needsAge && change?.age == null) next.needsAge = true;
    if (complete.has(member.id)) next.careReviewed = true;
    return next;
  });

  const h = u.household;
  const answered = new Set<AnswerKey>(profile.answered ?? []);
  if (u.rosterComplete && members.length) answered.add('roster');
  if (h.taxHouseholdSize !== null || h.filingStatus !== null) answered.add('taxHousehold');
  if (h.affordableEmployerOffer !== null) answered.add('employerOffer');
  if (h.immigration !== null) answered.add('immigration');
  if (u.noMustHaveProviders || u.providers.length) answered.add('providers');

  const existing = profile.providers ?? [];
  const known = new Set(existing.map((p) => p.name.toLowerCase()));
  const providers = [
    ...existing,
    ...u.providers.filter((p) => !known.has(p.name.toLowerCase())).map((p) => ({ id: newId('provider'), ...p })),
  ];

  // Keep the tax household in step with the people covered unless it was set separately.
  const taxFollowsMembers = profile.taxHouseholdSize === profile.members.length || profile.members.length === 0;
  const next: Profile = {
    ...profile,
    members,
    taxHouseholdSize: h.taxHouseholdSize ?? (taxFollowsMembers ? Math.max(1, members.length) : profile.taxHouseholdSize),
    annualIncome: h.annualIncome ?? profile.annualIncome,
    overSubsidyLimit: h.overSubsidyLimit ?? (h.annualIncome !== null ? false : profile.overSubsidyLimit),
    filingStatus: h.filingStatus ?? profile.filingStatus,
    immigration: h.immigration ?? profile.immigration,
    affordableEmployerOffer: h.affordableEmployerOffer ?? profile.affordableEmployerOffer,
    providers,
    answered: [...answered],
  };
  if (h.inKingCounty !== null) next.inKingCounty = h.inKingCounty;
  return next;
}

const FILING_LABELS: Record<FilingStatus, string> = {
  single: 'single or head of household',
  joint: 'married filing jointly',
  separate: 'married filing separately',
};
const IMMIGRATION_LABELS: Record<ImmigrationStatus, string> = {
  citizen: 'citizens or nationals',
  qualified: 'permanent residents or similar',
  other: 'other status',
};

/** How an item's drug link changed, as a suffix for its line in the change list. */
function linkNote(was: CareItem | undefined, item: CareItem): string {
  if (item.drug && item.drug.rxcui !== was?.drug?.rxcui) return `, linked to ${item.drug.name}`;
  if (item.notInDrugDatabase && !was?.notInDrugDatabase) return ', not in the drug database';
  return '';
}

/** Plain-language list of what one set of updates changed, shown under the assistant's reply. */
export function describeChanges(before: Profile, after: Profile, u: ChatUpdates): string[] {
  const lines: string[] = [];
  const beforeIds = new Set(before.members.map((m) => m.id));
  const newPeople = after.members.filter((m) => !beforeIds.has(m.id));
  for (const m of newPeople) lines.push(`Added ${nameOf(m)}${m.needsAge ? ' (age needed)' : `, age ${m.age}`}`);
  for (const m of after.members) {
    const old = before.members.find((b) => b.id === m.id);
    if (old && old.label !== m.label) lines.push(`Renamed ${nameOf(old)} to ${nameOf(m)}`);
    if (old && (old.age !== m.age || (old.needsAge && !m.needsAge))) lines.push(`${nameOf(m)} is ${m.age}`);
    for (const item of m.careItems) {
      const was = old?.careItems.find((i) => i.id === item.id);
      const same = was && was.name === item.name && was.category === item.category && was.perYear === item.perYear && was.monthlyCost === item.monthlyCost;
      if (same) continue;
      const amount = item.category === 'selfPay' ? `${dollars(item.monthlyCost ?? 0)}/month` : `${item.perYear}× a year`;
      // A corrected medication keeps its id (see carryOver), so it reads as an update rather than an add.
      lines.push(`${nameOf(m)}: ${was ? 'updated ' : ''}${item.name} (${CATEGORY_LABELS[item.category].toLowerCase()}, ${amount})${linkNote(was, item)}`);
    }
    for (const item of m.careItems) {
      const was = old?.careItems.find((i) => i.id === item.id);
      const same = was && was.name === item.name && was.category === item.category && was.perYear === item.perYear && was.monthlyCost === item.monthlyCost;
      // Only a link changed: the line above skipped it.
      if (same && linkNote(was, item)) lines.push(`${nameOf(m)}: ${item.name}${linkNote(was, item)}`);
    }
    const keptIds = new Set(m.careItems.map((i) => i.id));
    for (const item of old?.careItems ?? []) if (!keptIds.has(item.id)) lines.push(`${nameOf(m)}: removed ${item.name}`);
    if (m.careReviewed && !old?.careReviewed) lines.push(`${nameOf(m)}'s care list is complete`);
  }
  if (u.rosterComplete && after.members.length && !(before.answered ?? []).includes('roster')) {
    lines.push(`That's everyone: ${after.members.length === 1 ? '1 person' : `${after.members.length} people`}`);
  }
  const h = u.household;
  if (h.inKingCounty !== null) lines.push(h.inKingCounty ? 'Lives in King County' : 'Lives outside King County');
  if (h.taxHouseholdSize !== null) lines.push(`${h.taxHouseholdSize} on the tax return`);
  if (h.filingStatus !== null) lines.push(`Files ${FILING_LABELS[h.filingStatus]}`);
  if (h.overSubsidyLimit === true) lines.push('Income is above the subsidy limit');
  if (h.annualIncome !== null) lines.push(`Expected income ${dollars(h.annualIncome)}`);
  if (h.affordableEmployerOffer !== null) lines.push(h.affordableEmployerOffer ? 'Has an affordable job-based offer' : 'No affordable job-based offer');
  if (h.immigration !== null) lines.push(`Everyone: ${IMMIGRATION_LABELS[h.immigration]}`);
  const oldProviders = new Set((before.providers ?? []).map((p) => p.id));
  for (const p of after.providers ?? []) if (!oldProviders.has(p.id)) lines.push(`Must be in network: ${p.name}`);
  if (u.noMustHaveProviders && !u.providers.length) lines.push('No must-have doctors or hospitals');
  return lines;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The parts of the profile one reply changed, so the profile can point them out: `section:<id>` for each card,
 * `member:<id>` for a new or edited person, `item:<id>` for a new or edited care item, `provider:<id>` for a new or edited
 * doctor or hospital.
 */
export function changedParts(before: Profile, after: Profile): string[] {
  const parts = new Set<string>();
  for (const m of after.members) {
    const old = before.members.find((b) => b.id === m.id);
    if (!old || old.label !== m.label || old.age !== m.age || old.needsAge !== m.needsAge || old.careReviewed !== m.careReviewed) {
      parts.add(`member:${m.id}`);
    }
    for (const item of m.careItems) {
      if (!same(item, old?.careItems.find((i) => i.id === item.id))) parts.add(`item:${item.id}`);
    }
    // A removed item leaves nothing to point at, so point at its person.
    if (old?.careItems.some((i) => !m.careItems.some((x) => x.id === i.id))) parts.add(`member:${m.id}`);
  }
  const roster = (p: Profile) => (p.answered ?? []).includes('roster');
  if (parts.size || before.members.length !== after.members.length || roster(before) !== roster(after)) parts.add('section:people');
  if (before.inKingCounty !== after.inKingCounty) parts.add('section:location');
  for (const p of after.providers ?? []) {
    if (!same(p, (before.providers ?? []).find((b) => b.id === p.id))) parts.add(`provider:${p.id}`);
  }
  const providersAnswered = (p: Profile) => (p.answered ?? []).includes('providers');
  if (!same(before.providers ?? [], after.providers ?? []) || providersAnswered(before) !== providersAnswered(after)) {
    parts.add('section:providers');
  }
  const income = (p: Profile) => [p.overSubsidyLimit, p.annualIncome, p.taxHouseholdSize, p.filingStatus, p.immigration, p.affordableEmployerOffer];
  if (!same(income(before), income(after))) parts.add('section:income');
  return [...parts];
}
