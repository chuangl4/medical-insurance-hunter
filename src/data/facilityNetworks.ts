import type { Plan } from '../domain/types';

/**
 * Hospital networks by insurer, from Washington Healthplanfinder's facility search (anonymous plan browsing,
 * 2027 plans, King County). Each hospital was matched by its main campus. Results were identical for every
 * plan of an insurer, so they're kept per insurer. Silver plans weren't shown in the anonymous view; they're
 * assumed to use the same network as the insurer's bronze and gold plans.
 */
export const FACILITY_SOURCE = {
  name: 'Washington Healthplanfinder facility search',
  url: 'https://www.wahealthplanfinder.org/HBEWeb/Annon_ViewIndividualPlans',
  checked: '2026-11-14',
};

export type FacilityGroup = 'specialty' | 'general';

export interface Facility {
  id: string;
  name: string;
  /** Short column label. */
  short: string;
  address: string;
  group: FacilityGroup;
  /** Why it matters, for specialty centers. */
  why?: string;
}

export const FACILITIES: Facility[] = [
  { id: 'evergreen', name: 'EvergreenHealth Medical Center', short: 'Evergreen', address: '12040 NE 128th St, Kirkland', group: 'general' },
  { id: 'uw', name: 'UW Medical Center – Montlake', short: 'UW Montlake', address: '1959 NE Pacific St, Seattle', group: 'general' },
  { id: 'fredHutch', name: 'Fred Hutch Cancer Center', short: 'Fred Hutch', address: '825 Eastlake Ave E, Seattle', group: 'specialty', why: 'Cancer care' },
  { id: 'seattleChildrens', name: "Seattle Children's Hospital", short: "Seattle Children's", address: '4800 Sand Point Way NE, Seattle', group: 'specialty', why: 'Children' },
  { id: 'harborview', name: 'Harborview Medical Center', short: 'Harborview', address: '325 9th Ave, Seattle', group: 'specialty', why: 'Major trauma' },
  { id: 'uwNorthwest', name: 'UW Medical Center – Northwest', short: 'UW Northwest', address: '1550 N 115th St, Seattle', group: 'general' },
  { id: 'swedishFirstHill', name: 'Swedish First Hill', short: 'Swedish', address: '747 Broadway, Seattle', group: 'general' },
  { id: 'virginiaMason', name: 'Virginia Mason Medical Center', short: 'Virginia Mason', address: '1100 9th Ave, Seattle', group: 'general' },
  { id: 'overlake', name: 'Overlake Medical Center', short: 'Overlake', address: '1035 116th Ave NE, Bellevue', group: 'general' },
  { id: 'valley', name: 'Valley Medical Center', short: 'Valley', address: '400 S 43rd St, Renton', group: 'general' },
];

const ALL = FACILITIES.map((f) => f.id);
const except = (...ids: string[]) => ALL.filter((id) => !ids.includes(id));

/** Hospitals Healthplanfinder lists as covered, by insurer (as named in the plan data). */
const IN_NETWORK: Record<string, string[]> = {
  'Premera Blue Cross': ALL,
  Molina: ALL,
  UnitedHealthcare: ALL,
  'Kaiser Permanente': except('virginiaMason'),
  'Community Health Plan of Washington': except('virginiaMason', 'overlake'),
  'Ambetter (Coordinated Care)': except('uw'),
  'Regence BlueShield': ['seattleChildrens', 'swedishFirstHill'],
  BridgeSpan: ['seattleChildrens', 'swedishFirstHill'],
  Wellpoint: [],
};

export type FacilityStatus = 'in' | 'out' | 'unknown';

export const facilityStatus = (plan: Pick<Plan, 'carrier'>, facilityId: string): FacilityStatus => {
  const list = IN_NETWORK[plan.carrier];
  if (!list) return 'unknown';
  return list.includes(facilityId) ? 'in' : 'out';
};

export const FACILITY_CARRIERS = Object.keys(IN_NETWORK);
