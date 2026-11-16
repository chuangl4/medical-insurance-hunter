import { doctorStatusFor, hospitalStatus, type HospitalId } from '../data/hospitalNetworks';
import { excludesPlan } from './doctors';
import { networkTypeOf } from './networkRules';
import type { Provider } from './profile';
import type { Channel, EvaluatedPlan, Metal, NetworkType, Plan } from './types';

/** A plan's network type, or 'unconfirmed' when its documents didn't say. */
export type NetworkChoice = NetworkType | 'unconfirmed';
export const networkOf = (plan: Plan): NetworkChoice => networkTypeOf(plan).type ?? 'unconfirmed';

export type SortKey =
  | 'expectedYear'
  | 'netMonthly'
  | 'badYear'
  | 'worstCase'
  | 'deductible'
  | 'oopMax'
  | 'specialist';

export const SORT_LABELS: Record<SortKey, string> = {
  expectedYear: 'Expected yearly cost',
  netMonthly: 'Monthly premium',
  badYear: 'Bad-year cost',
  worstCase: 'Worst-case cost',
  deductible: 'Deductible',
  oopMax: 'Out-of-pocket limit',
  specialist: 'Specialist copay',
};

export type BuyingRoute = 'any' | 'exchange' | 'direct';

export interface Filters {
  search: string;
  metals: Metal[];
  networks: NetworkChoice[];
  carriers: string[];
  route: BuyingRoute;
  hsaOnly: boolean;
  cascadeOnly: boolean;
  maxMonthly: number | null;
  maxDeductible: number | null;
  maxOopMax: number | null;
  /** Hospitals a plan must have in network. */
  hospitals: HospitalId[];
  /** Doctors (provider ids) a plan must not be confirmed out of network for. */
  doctors: string[];
}

export const EMPTY_FILTERS: Filters = {
  search: '',
  metals: [],
  networks: [],
  carriers: [],
  route: 'any',
  hsaOnly: false,
  cascadeOnly: false,
  maxMonthly: null,
  maxDeductible: null,
  maxOopMax: null,
  hospitals: [],
  doctors: [],
};

function routeAllows(route: BuyingRoute, channel: Channel): boolean {
  if (route === 'exchange') return channel !== 'off';
  if (route === 'direct') return channel !== 'on';
  return true;
}

export function applyFilters(plans: EvaluatedPlan[], f: Filters, providers: Provider[] = []): EvaluatedPlan[] {
  const doctors = providers.filter((p) => f.doctors.includes(p.id));
  const search = f.search.trim().toLowerCase();
  return plans.filter(({ plan, netMonthly, deductible, oopMax }) => {
    if (search && !`${plan.name} ${plan.carrier}`.toLowerCase().includes(search)) return false;
    if (f.metals.length && !f.metals.includes(plan.metal)) return false;
    if (f.networks.length && !f.networks.includes(networkOf(plan))) return false;
    if (f.carriers.length && !f.carriers.includes(plan.carrier)) return false;
    if (!routeAllows(f.route, plan.channel)) return false;
    if (f.hsaOnly && !plan.hsaEligible) return false;
    if (f.cascadeOnly && !plan.cascadeCare) return false;
    if (f.hospitals.some((hospital) => hospitalStatus(plan, hospital) !== 'in')) return false;
    if (doctors.some((d) => excludesPlan(doctorStatusFor(d, plan).status))) return false;
    if (f.maxMonthly !== null && netMonthly > f.maxMonthly) return false;
    if (f.maxDeductible !== null && (deductible === null || deductible > f.maxDeductible)) return false;
    if (f.maxOopMax !== null && (oopMax === null || oopMax > f.maxOopMax)) return false;
    return true;
  });
}

/**
 * How many plans each option of a check-box filter would show, given every other filter.
 * Lets the filter show counts and grey out options that would leave nothing.
 */
export function optionCounts<K extends 'metals' | 'networks' | 'carriers'>(
  plans: EvaluatedPlan[],
  f: Filters,
  field: K,
  keyOf: (plan: Plan) => string,
  providers: Provider[] = [],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { plan } of applyFilters(plans, { ...f, [field]: [] }, providers)) counts[keyOf(plan)] = (counts[keyOf(plan)] ?? 0) + 1;
  return counts;
}

function sortValue(p: EvaluatedPlan, key: SortKey): number | null {
  if (key === 'specialist') {
    const share = p.plan.benefits?.specialist;
    return share?.kind === 'copay' ? share.amount : null;
  }
  return p[key];
}

export function sortPlans(plans: EvaluatedPlan[], key: SortKey, descending = false): EvaluatedPlan[] {
  const direction = descending ? -1 : 1;
  return [...plans].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (av === bv) return a.plan.name.localeCompare(b.plan.name);
    // Plans missing this value stay last in either direction.
    if (av === null) return 1;
    if (bv === null) return -1;
    return av < bv ? -direction : direction;
  });
}
