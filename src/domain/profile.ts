import type { DoctorFields } from './doctors';
import type { CareScenario } from './scenarios';
import type { CashReason } from './cashMeds';
import type { DrugCoverage, DrugLine, DrugRef } from './drugs';
import { CARE_PRICES } from './rules2027';
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
  /**
   * Monthly cash cost for self-pay items. For a medication linked to a drug, the price of one fill without
   * insurance, which plans that cover it apply their cost share to.
   */
  monthlyCost: number | null;
  /** The RxNorm drug this medication is, so its coverage can be checked plan by plan. */
  drug?: DrugRef;
  notes: string;
  /** For self-pay items: why the plan won't pay, which decides the suggested next steps. */
  cashReason?: CashReason;
  /** The user said this medication isn't in the drug database (a compounded product, say), so it's never linked. */
  notInDrugDatabase?: boolean;
}

/** Care categories that are medications, and so can be linked to the drug database. */
export const MEDICATION_CATEGORIES: CareCategory[] = ['genericFills', 'brandFills', 'selfPay'];

/**
 * A medication that should be linked to the drug database but isn't yet, so its coverage can't be checked plan by plan.
 * Things plans almost never cover (cosmetic or compounded products) and ones the user says aren't in the database don't
 * need a link.
 */
export const needsDrugLink = (item: CareItem): boolean =>
  MEDICATION_CATEGORIES.includes(item.category) &&
  !item.drug &&
  !item.notInDrugDatabase &&
  item.cashReason !== 'usuallyNotCovered' &&
  item.name.trim().length > 0;

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

/**
 * A hospital, clinic, or doctor that must be in network. `hospitalId` is set when the provider is a hospital the app
 * can check networks for; doctors carry their registry record, website check, and the user's confirmations instead.
 */
export interface Provider extends DoctorFields {
  id: string;
  name: string;
  hospitalId: string | null;
  /**
   * Set for a candidate doctor from earlier versions: someone you'd see if you chose this insurer. No longer shown or
   * used; kept so saved profiles stay valid, and so these never count as must-have doctors.
   */
  candidateFor?: string;
  /** A short note for a candidate, such as specialty and clinic. */
  note?: string;
}

/** True for a candidate doctor, as opposed to a must-have. */
export const isCandidate = (p: Provider): boolean => Boolean(p.candidateFor);

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
  /** Drug coverage by RxNorm id, then plan id. */
  drugCoverage?: Record<string, DrugCoverage>;
  /** The care every plan's "Your scenario" cost is priced against; the default when unset. */
  scenario?: CareScenario;
  /** False while a new user is in first-time setup; unset for profiles from before setup was tracked. */
  setupDone?: boolean;
  /** Plan ids picked for Compare, kept so a return visit picks up where it left off. */
  shortlist?: string[];
  /** The page last open, so a return visit opens there. */
  lastPage?: AppPage;
}

export type AppPage = 'plans' | 'compare';
export const MAX_SHORTLIST = 4;

/** First-time setup: setup started and not finished, or nobody to price plans for yet. */
export const inSetup = (profile: Profile): boolean => profile.setupDone === false || profile.members.length === 0;

/**
 * Who plans are priced for before anyone is added: one adult with no regular care. Age 40 is the usual example in
 * published premium comparisons (KFF uses it), and sits mid-way on the age curve. Never saved to the profile.
 */
export const SAMPLE_MEMBER: ProfileMember = { id: 'sample', label: 'Sample adult', age: 40, careItems: [] };

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
  const drugs: DrugLine[] = [];
  for (const item of member.careItems) {
    const line = drugLine(item);
    if (line) {
      drugs.push(line);
    } else if (item.category === 'selfPay') {
      if (item.monthlyCost) selfPayDrugs[item.id] = item.monthlyCost;
    } else {
      counts[item.category] += item.perYear;
    }
  }
  return { id: member.id, label: member.label, age: member.age, ...counts, selfPayDrugs, ...(drugs.length ? { drugs } : {}) };
}

/** A medication linked to a drug becomes a line priced per plan; anything else is counted as before. */
export function drugLine(item: CareItem): DrugLine | null {
  if (!item.drug) return null;
  const assume = item.category === 'genericFills' ? 'generic' : item.category === 'brandFills' ? 'brand' : item.category === 'selfPay' ? 'cash' : null;
  if (!assume) return null;
  const fallbackPrice = assume === 'generic' ? CARE_PRICES.genericFill : CARE_PRICES.brandFill;
  return {
    itemId: item.id,
    name: item.name || item.drug.name,
    rxcui: item.drug.rxcui,
    price: item.monthlyCost ?? fallbackPrice,
    fillsPerYear: assume === 'cash' ? 12 : item.perYear,
    assume,
  };
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
