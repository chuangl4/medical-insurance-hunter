import type { DrugLine } from './drugs';
export type Metal = 'bronze' | 'silver' | 'gold' | 'platinum';
export type NetworkType = 'HMO' | 'PPO' | 'EPO';

/** CMS Quality Rating System stars (1–5) for an insurer and plan type; null when CMS had too little data. */
export interface QualityRating {
  planType?: string;
  overall: number | null;
  medicalCare: number | null;
  memberExperience: number | null;
  planAdministration: number | null;
}

/** A plan's network rules, from its Summary of Benefits and Coverage. */
export interface NetworkRules {
  type: 'HMO' | 'EPO' | 'PPO' | 'POS' | null;
  /** Whether seeing a specialist needs a referral; 'yesSomeSelf' means yes, except some specialists you may see directly. */
  referral: 'no' | 'yes' | 'yesSomeSelf' | 'unknown';
  /** Whether care outside the network is paid: only emergencies (HMO/EPO), or partly (PPO). */
  outOfNetwork: 'emergencyOnly' | 'partial' | 'unknown';
  source: string;
  /** The phone line the summary gives for a list of network providers. */
  directoryPhone?: string;
  /** Set when this plan's own summary wasn't found: the same-network plan whose rules it shares. */
  inferredFrom?: string;
}
/** Where a plan can be bought: the exchange, directly from the insurer, or either. */
export type Channel = 'on' | 'off' | 'both';

export interface Plan {
  id: string;
  carrier: string;
  name: string;
  metal: Metal;
  network: NetworkType | null;
  /** Where the network type comes from when it isn't the plan's own current documents. */
  networkNote?: string;
  channel: Channel;
  hsaEligible: boolean;
  cascadeCare: boolean;
  publicOption: boolean;
  /** Counties where the plan is sold, or 'all'. */
  counties: string[] | 'all';
  /** Monthly premium for a 21-year-old; other ages are scaled by the age curve. */
  basePremium: number;
  ratesSource: string;
  /** Null when the plan's benefits couldn't be confirmed. */
  benefits: Benefits | null;
}

export type CostShare =
  | {
      kind: 'copay';
      amount: number;
      afterDeductible: boolean;
      /** Set when the copay is charged per hospital day, up to this many days per stay. */
      perDayMax?: number;
    }
  /** Share the member pays after the deductible, from 0 to 1. */
  | { kind: 'coinsurance'; rate: number };

export interface Benefits {
  deductible: { individual: number; family: number };
  oopMax: { individual: number; family: number };
  primary: CostShare;
  specialist: CostShare;
  genericRx: CostShare;
  /** Preferred brand-name drugs. */
  brandRx: CostShare;
  /** Unset when the plan's summary doesn't list it; preferred brand is used instead, marked as an estimate. */
  nonPreferredBrandRx?: CostShare;
  specialtyRx?: CostShare;
  lab: CostShare;
  /** X-rays and other non-advanced tests, such as ultrasounds and eye tests. */
  diagnostic: CostShare;
  /** CT, PET, and MRI scans. */
  scan: CostShare;
  er: CostShare;
  hospital: CostShare;
  /** Low-cost first visits each year, before the regular cost share applies. */
  introVisits?: { count: number; copay: number; includesSpecialist: boolean };
  source: string;
}

export interface Member {
  id: string;
  label: string;
  age: number;
  primaryVisits: number;
  specialistVisits: number;
  genericFills: number;
  brandFills: number;
  labTests: number;
  diagnosticTests: number;
  scans: number;
  erVisits: number;
  hospitalStays: number;
  /** Monthly cost of each medication paid for without insurance. */
  selfPayDrugs: Record<string, number>;
  /** Medications linked to a drug, priced per plan from its coverage. */
  drugs?: DrugLine[];
}

export type FilingStatus = 'single' | 'joint' | 'separate';
export type ImmigrationStatus = 'citizen' | 'qualified' | 'other';

export interface Household {
  county: string;
  members: Member[];
  taxHouseholdSize: number;
  annualIncome: number | null;
  /** Lets someone skip entering income when they know it's over the subsidy limit. */
  overSubsidyLimit: boolean;
  filingStatus: FilingStatus;
  immigration: ImmigrationStatus;
  affordableEmployerOffer: boolean;
}

export type SubsidyStatus =
  | 'needs-income'
  | 'eligible'
  | 'no-credit-needed'
  | 'likely-apple-health'
  | 'over-income'
  | 'ineligible';

export interface SubsidyEstimate {
  status: SubsidyStatus;
  monthlyCredit: number;
  fplPercent: number | null;
  contributionPercent: number | null;
  benchmarkMonthly: number | null;
  csrEligible: boolean;
  cascadeSavingsPossible: boolean;
  message: string;
}

export interface EvaluatedPlan {
  plan: Plan;
  fullMonthly: number;
  creditMonthly: number;
  netMonthly: number;
  /** Yearly medication costs outside the plan, included in the yearly totals. */
  selfPayYear: number;
  expectedYear: number | null;
  badYear: number | null;
  worstCase: number | null;
  /** The parts of the yearly totals, for explaining them. Care amounts are null without a benefit summary. */
  premiumYear: number;
  careExpected: number | null;
  careBadYear: number | null;
  deductible: number | null;
  oopMax: number | null;
}
