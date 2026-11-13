import type { Member, Plan } from '../domain/types';

export type CareCounts = Pick<
  Member,
  | 'primaryVisits'
  | 'specialistVisits'
  | 'genericFills'
  | 'brandFills'
  | 'labTests'
  | 'diagnosticTests'
  | 'scans'
  | 'erVisits'
  | 'hospitalStays'
>;
export type NetworkStatus = 'in' | 'limited' | 'not-listed' | 'unknown';

export interface CareNeed {
  label: string;
  adds: string;
  care: Partial<CareCounts>;
}
export interface SelfPayDrug {
  label: string;
  monthlyCost: number;
}
export interface Hospital {
  name: string;
  source: string;
  status: (plan: Plan) => NetworkStatus;
}

/**
 * Optional presets from src/data/personal/config.ts, which git ignores. See the README. Care needs and
 * self-pay drugs are hints for the care parser; hospitals drive the network filter.
 */
export interface PersonalConfig {
  careNeeds?: Record<string, CareNeed>;
  selfPayDrugs?: Record<string, SelfPayDrug>;
  hospitals?: Record<string, Hospital>;
  requiredHospitals?: string[];
}

const modules = import.meta.glob<{ default: PersonalConfig }>('./personal/config.ts', { eager: true });

export const PERSONAL: PersonalConfig = Object.values(modules)[0]?.default ?? {};
