import type { FilingStatus, Household, ImmigrationStatus, Member } from './types';

/** What a care item counts as when costing plans. `selfPay` is paid in cash on every plan. */
export const CARE_CATEGORIES = [
  'primaryVisits',
  'specialistVisits',
  'genericFills',
  'brandFills',
  'labTests',
  'diagnosticTests',
  'scans',
  'erVisits',
  'hospitalStays',
  'selfPay',
] as const;
export type CareCategory = (typeof CARE_CATEGORIES)[number];
type CountCategory = Exclude<CareCategory, 'selfPay'>;

export const CATEGORY_LABELS: Record<CareCategory, string> = {
  primaryVisits: 'Primary care visit',
  specialistVisits: 'Specialist visit',
  genericFills: 'Generic drug fill',
  brandFills: 'Brand-name drug fill',
  labTests: 'Lab test',
  diagnosticTests: 'X-ray, ultrasound, or eye test',
  scans: 'CT or MRI scan',
  erVisits: 'ER visit',
  hospitalStays: 'Hospital stay',
  selfPay: 'Paid without insurance',
};

export interface CareItem {
  id: string;
  name: string;
  category: CareCategory;
  /** Times per year. Monthly prescriptions are 12 fills. Not used for self-pay items. */
  perYear: number;
  /** Monthly cash cost, used only for self-pay items. */
  monthlyCost: number | null;
  notes: string;
}

export interface ProfileMember {
  id: string;
  label: string;
  age: number;
  careItems: CareItem[];
  /** Set when the person was added without an age; `age` holds a placeholder until it's given. */
  needsAge?: boolean;
  /** The user has confirmed this person's care list is complete. */
  careReviewed?: boolean;
}

/** A hospital, clinic, or doctor that must be in network. `hospitalId` is set when the app can check networks for it. */
export interface Provider {
  id: string;
  name: string;
  hospitalId: string | null;
}

/** Questions whose answer can leave a default unchanged, so the answer itself is recorded. */
export const ANSWER_KEYS = ['roster', 'taxHousehold', 'employerOffer', 'immigration', 'providers'] as const;
export type AnswerKey = (typeof ANSWER_KEYS)[number];

export interface Profile {
  version: 1;
  members: ProfileMember[];
  taxHouseholdSize: number;
  annualIncome: number | null;
  overSubsidyLimit: boolean;
  filingStatus: FilingStatus;
  immigration: ImmigrationStatus;
  affordableEmployerOffer: boolean;
  /** Unset until asked. Plan data only covers King County. */
  inKingCounty?: boolean;
  providers?: Provider[];
  answered?: AnswerKey[];
}

export const EMPTY_PROFILE: Profile = {
  version: 1,
  members: [],
  taxHouseholdSize: 1,
  annualIncome: null,
  overSubsidyLimit: false,
  filingStatus: 'single',
  immigration: 'citizen',
  affordableEmployerOffer: false,
};

export const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const emptyCounts = (): Record<CountCategory, number> => ({
  primaryVisits: 0,
  specialistVisits: 0,
  genericFills: 0,
  brandFills: 0,
  labTests: 0,
  diagnosticTests: 0,
  scans: 0,
  erVisits: 0,
  hospitalStays: 0,
});

/** Turns one person's care list into the counts the cost calculator uses. */
export function memberForCalc(member: ProfileMember): Member {
  const counts = emptyCounts();
  const selfPayDrugs: Record<string, number> = {};
  for (const item of member.careItems) {
    if (item.category === 'selfPay') {
      if (item.monthlyCost) selfPayDrugs[item.id] = item.monthlyCost;
    } else {
      counts[item.category] += item.perYear;
    }
  }
  return { id: member.id, label: member.label, age: member.age, ...counts, selfPayDrugs };
}

export function householdFromProfile(profile: Profile): Household {
  return {
    county: 'King',
    members: profile.members.map(memberForCalc),
    taxHouseholdSize: profile.taxHouseholdSize,
    annualIncome: profile.annualIncome,
    overSubsidyLimit: profile.overSubsidyLimit,
    filingStatus: profile.filingStatus,
    immigration: profile.immigration,
    affordableEmployerOffer: profile.affordableEmployerOffer,
  };
}

/** Household saved in the browser by earlier versions, before profiles moved to the server. */
export type LegacyHousehold = Partial<Omit<Household, 'members'>> & {
  members?: (Partial<Record<CountCategory, number>> & {
    id?: string;
    label?: string;
    age?: number;
    selfPayDrugs?: Record<string, number>;
  })[];
};

/** Converts a household saved by earlier versions into a profile, keeping every count as a care item. */
export function profileFromLegacy(legacy: LegacyHousehold, drugNames: Record<string, string> = {}): Profile {
  const members = (legacy.members ?? []).map((m, index): ProfileMember => {
    const careItems: CareItem[] = [];
    for (const category of Object.keys(emptyCounts()) as CountCategory[]) {
      const count = m[category] ?? 0;
      if (count > 0) {
        careItems.push({ id: newId('care'), name: CATEGORY_LABELS[category], category, perYear: count, monthlyCost: null, notes: '' });
      }
    }
    for (const [drug, monthlyCost] of Object.entries(m.selfPayDrugs ?? {})) {
      careItems.push({ id: newId('care'), name: drugNames[drug] ?? drug, category: 'selfPay', perYear: 12, monthlyCost, notes: '' });
    }
    return { id: m.id ?? newId('member'), label: m.label ?? `Person ${index + 1}`, age: m.age ?? 30, careItems };
  });
  return {
    ...EMPTY_PROFILE,
    members,
    taxHouseholdSize: legacy.taxHouseholdSize ?? Math.max(1, members.length),
    annualIncome: legacy.annualIncome ?? null,
    overSubsidyLimit: legacy.overSubsidyLimit ?? false,
    filingStatus: legacy.filingStatus ?? 'single',
    immigration: legacy.immigration ?? 'citizen',
    affordableEmployerOffer: legacy.affordableEmployerOffer ?? false,
  };
}
