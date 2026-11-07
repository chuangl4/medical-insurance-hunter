export type Metal = 'bronze' | 'silver' | 'gold' | 'platinum';
export type NetworkType = 'HMO' | 'PPO' | 'EPO';
/** Where a plan can be bought: the exchange, directly from the insurer, or either. */
export type Channel = 'on' | 'off' | 'both';

export interface Plan {
  id: string;
  carrier: string;
  name: string;
  metal: Metal;
  network: NetworkType | null;
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
  brandRx: CostShare;
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
  careNeeds: string[];
  /** Monthly cost of each medication paid for without insurance. */
  selfPayDrugs: Record<string, number>;
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
  deductible: number | null;
  oopMax: number | null;
}
