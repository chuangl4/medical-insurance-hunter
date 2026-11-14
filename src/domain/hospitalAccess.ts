import { FACILITIES, facilityStatus, type Facility, type FacilityStatus } from '../data/facilityNetworks';
import type { Plan } from './types';

export type Tier = 'mustHave' | 'specialty' | 'general';

export const TIER_LABELS: Record<Tier, string> = {
  mustHave: 'Your must-haves',
  specialty: 'Specialty centers, just in case',
  general: 'Other nearby hospitals',
};

export const tierOf = (f: Facility, requiredIds: string[]): Tier => (requiredIds.includes(f.id) ? 'mustHave' : f.group);

/** Facilities in column order: must-haves first, then specialty centers, then the rest. */
export function groupedFacilities(requiredIds: string[]): { tier: Tier; facilities: Facility[] }[] {
  return (['mustHave', 'specialty', 'general'] as Tier[])
    .map((tier) => ({ tier, facilities: FACILITIES.filter((f) => tierOf(f, requiredIds) === tier) }))
    .filter((g) => g.facilities.length > 0);
}

export interface Disagreement {
  facility: Facility;
  /** What the app's hospital list says (used by the filter). */
  listSays: string;
  directorySays: FacilityStatus;
}

/**
 * Where Healthplanfinder disagrees with the hospital list the filter uses. Only "in" vs anything else counts,
 * since the filter only accepts "in".
 */
export function disagreements(
  plan: Plan,
  requiredIds: string[],
  listStatus: (plan: Plan, id: string) => string,
): Disagreement[] {
  return FACILITIES.filter((f) => requiredIds.includes(f.id)).flatMap((facility) => {
    const listSays = listStatus(plan, facility.id);
    const directorySays = facilityStatus(plan, facility.id);
    if (directorySays === 'unknown' || (listSays === 'in') === (directorySays === 'in')) return [];
    return [{ facility, listSays, directorySays }];
  });
}

export interface AccessSummary {
  inCount: number;
  total: number;
  missing: Facility[];
  known: boolean;
}

/** How many of the non-must-have hospitals a plan's insurer covers. */
export function otherAccess(plan: Plan, requiredIds: string[]): AccessSummary {
  const others = FACILITIES.filter((f) => !requiredIds.includes(f.id));
  const statuses = others.map((f) => ({ f, s: facilityStatus(plan, f.id) }));
  return {
    inCount: statuses.filter((x) => x.s === 'in').length,
    total: others.length,
    missing: statuses.filter((x) => x.s === 'out').map((x) => x.f),
    known: statuses.every((x) => x.s !== 'unknown'),
  };
}
