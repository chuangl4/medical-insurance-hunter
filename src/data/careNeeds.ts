import type { Member } from '../domain/types';
import { PERSONAL, type CareCounts, type CareNeed, type SelfPayDrug } from './personalConfig';

export type { CareCounts } from './personalConfig';

/**
 * Starting points for a year of care, not medical guidance. People should replace these with what
 * their doctor actually plans.
 */
export const CARE_NEEDS: Record<string, CareNeed> = {
  specialistCare: {
    label: 'Ongoing specialist care',
    adds: '4 specialist visits and 2 lab tests',
    care: { specialistVisits: 4, labTests: 2 },
  },
  dailyMedication: {
    label: 'Daily generic medication',
    adds: '12 generic drug fills',
    care: { genericFills: 12 },
  },
  ...PERSONAL.careNeeds,
};

export const CARE_NEED_IDS = Object.keys(CARE_NEEDS);

/**
 * Medications counted at full price on every plan. These costs don't count toward a plan's
 * deductible or out-of-pocket limit.
 */
export const SELF_PAY_DRUGS: Record<string, SelfPayDrug> = {
  otherMedication: { label: 'Medication not covered by plans', monthlyCost: 100 },
  ...PERSONAL.selfPayDrugs,
};

export const SELF_PAY_DRUG_IDS = Object.keys(SELF_PAY_DRUGS);

/** Adds a need's care to a member, or takes it back out when it's turned off. */
export function toggleCareNeed(member: Member, id: string): Member {
  const active = member.careNeeds.includes(id);
  const next: Member = {
    ...member,
    careNeeds: active ? member.careNeeds.filter((need) => need !== id) : [...member.careNeeds, id],
  };
  for (const [key, amount] of Object.entries(CARE_NEEDS[id].care) as [keyof CareCounts, number][]) {
    next[key] = Math.max(0, member[key] + (active ? -amount : amount));
  }
  return next;
}
