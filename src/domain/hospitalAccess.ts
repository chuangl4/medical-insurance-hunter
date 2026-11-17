import { FACILITIES, facilityStatus, type Facility, type FacilityStatus } from '../data/facilityNetworks';
import { HOSPITAL_LISTS, type ListStatus } from '../data/hospitalLists';
import type { NetworkStatus } from '../data/personalConfig';
import { planNetwork } from '../data/planNetworks';
import type { Plan } from './types';

export type AccessStatus = ListStatus | 'unknown';

/** A plan's access to one hospital, from the hospital's own list when it has one, else Healthplanfinder. */
export interface FacilityAccess {
  status: AccessStatus;
  /** The hospital's condition or explanation, when it gives one. */
  note?: string;
  /** Where the status comes from. */
  from: 'hospital' | 'healthplanfinder' | 'none';
  source?: string;
  year?: string;
  directorySays: FacilityStatus;
  /** The hospital's list and Healthplanfinder disagree about whether the plan is in network. */
  disagrees: boolean;
}

const usable = (s: AccessStatus) => s === 'in' || s === 'conditional';

export function facilityAccess(plan: Pick<Plan, 'carrier' | 'name'>, facilityId: string): FacilityAccess {
  const directorySays = facilityStatus(plan, facilityId);
  const list = HOSPITAL_LISTS[facilityId];
  const network = planNetwork(plan);
  if (list && network) {
    const entry = list.entries[network] ?? { status: 'notListed' as const };
    const disagrees = directorySays !== 'unknown' && entry.status !== 'unclear' && usable(entry.status) !== (directorySays === 'in');
    return { status: entry.status, note: entry.note, from: 'hospital', source: list.source, year: list.year, directorySays, disagrees };
  }
  if (directorySays === 'unknown') return { status: 'unknown', from: 'none', directorySays, disagrees: false };
  return { status: directorySays, from: 'healthplanfinder', directorySays, disagrees: false };
}

/** The must-have hospital status the plan filter uses, from the hospital's own list. */
export function listNetworkStatus(facilityId: string): (plan: Plan) => NetworkStatus {
  return (plan) => {
    const { status } = facilityAccess(plan, facilityId);
    return status === 'conditional' ? 'limited' : status === 'notListed' ? 'not-listed' : status === 'unclear' ? 'unknown' : status;
  };
}

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
  access: FacilityAccess;
}

/** Hospitals whose own list disagrees with Healthplanfinder about this plan. */
export function disagreements(plan: Plan): Disagreement[] {
  return FACILITIES.flatMap((facility) => {
    const access = facilityAccess(plan, facility.id);
    return access.disagrees ? [{ facility, access }] : [];
  });
}

export interface AccessSummary {
  inCount: number;
  conditionalCount: number;
  total: number;
  missing: Facility[];
  known: boolean;
}

/** How many of the non-must-have hospitals a plan can use. */
export function otherAccess(plan: Plan, requiredIds: string[]): AccessSummary {
  const others = FACILITIES.filter((f) => !requiredIds.includes(f.id));
  const statuses = others.map((f) => ({ f, s: facilityAccess(plan, f.id).status }));
  return {
    inCount: statuses.filter((x) => x.s === 'in').length,
    conditionalCount: statuses.filter((x) => x.s === 'conditional').length,
    total: others.length,
    missing: statuses.filter((x) => x.s === 'out' || x.s === 'notListed').map((x) => x.f),
    known: statuses.every((x) => x.s !== 'unknown'),
  };
}
