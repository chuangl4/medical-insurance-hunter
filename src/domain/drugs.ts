import type { Benefits, CostShare, Plan } from './types';

/** A drug identified in RxNorm (National Library of Medicine). */
export interface DrugRef {
  rxcui: string;
  name: string;
}

/** Formulary tiers, from cheapest to most expensive. */
export const DRUG_TIERS = ['preventive', 'generic', 'preferredBrand', 'nonPreferredBrand', 'specialty'] as const;
export type DrugTier = (typeof DRUG_TIERS)[number];
export const TIER_LABELS: Record<DrugTier, string> = {
  preventive: '$0 preventive',
  generic: 'Generic',
  preferredBrand: 'Preferred brand',
  nonPreferredBrand: 'Non-preferred brand',
  specialty: 'Specialty',
};

export const RESTRICTIONS = ['priorAuth', 'stepTherapy', 'quantityLimit'] as const;
export type Restriction = (typeof RESTRICTIONS)[number];
export const RESTRICTION_LABELS: Record<Restriction, string> = {
  priorAuth: 'needs prior authorization',
  stepTherapy: 'step therapy (try another drug first)',
  quantityLimit: 'quantity limit',
};

/** Whether one plan covers one drug. */
export interface PlanDrugStatus {
  covered: boolean;
  tier?: DrugTier;
  restrictions?: Restriction[];
}

/** What's known about one drug's coverage, by plan id. Saved in the (encrypted) profile, since it reveals medications. */
export interface DrugCoverage {
  checkedAt: string;
  source: string;
  plans: Record<string, PlanDrugStatus>;
}

export type CoverageLookup = (rxcui: string, plan: Plan) => PlanDrugStatus | undefined;

/** One medication, as the calculator sees it before a plan is chosen. */
export interface DrugLine {
  itemId: string;
  name: string;
  rxcui: string | null;
  /** Price of one fill without insurance; also the price a plan's coinsurance applies to. */
  price: number;
  fillsPerYear: number;
  /** What to assume when coverage for a plan isn't known. */
  assume: 'generic' | 'brand' | 'cash';
}

/** The cost share for a tier, falling back to the plan's brand-name share when the tier isn't in its summary. */
export function tierShare(benefits: Benefits, tier: DrugTier): { share: CostShare; estimated: boolean } {
  // ACA preventive drugs (some contraceptives, statins, and others) cost nothing on every plan.
  if (tier === 'preventive') return { share: { kind: 'copay', amount: 0, afterDeductible: false }, estimated: false };
  if (tier === 'generic') return { share: benefits.genericRx, estimated: false };
  if (tier === 'preferredBrand') return { share: benefits.brandRx, estimated: false };
  const exact = tier === 'nonPreferredBrand' ? benefits.nonPreferredBrandRx : benefits.specialtyRx;
  return exact ? { share: exact, estimated: false } : { share: benefits.brandRx, estimated: true };
}

export type ResolvedDrug =
  | { kind: 'plan'; share: CostShare; tier: DrugTier | null; source: 'checked' | 'assumed'; estimated: boolean; restrictions: Restriction[] }
  | { kind: 'cash'; source: 'checked' | 'assumed' };

/** How a plan handles one medication: through its drug benefit, or not at all (paid in cash). */
export function resolveDrug(line: DrugLine, plan: Plan, benefits: Benefits, lookup?: CoverageLookup): ResolvedDrug {
  const status = line.rxcui && lookup ? lookup(line.rxcui, plan) : undefined;
  if (status) {
    if (!status.covered) return { kind: 'cash', source: 'checked' };
    const tier = status.tier ?? (line.assume === 'generic' ? 'generic' : 'preferredBrand');
    const { share, estimated } = tierShare(benefits, tier);
    return { kind: 'plan', share, tier, source: 'checked', estimated: estimated || !status.tier, restrictions: status.restrictions ?? [] };
  }
  if (line.assume === 'cash') return { kind: 'cash', source: 'assumed' };
  return {
    kind: 'plan',
    share: line.assume === 'generic' ? benefits.genericRx : benefits.brandRx,
    tier: null,
    source: 'assumed',
    estimated: false,
    restrictions: [],
  };
}

export const coverageLookup =
  (coverage: Record<string, DrugCoverage> | undefined): CoverageLookup =>
  (rxcui, plan) =>
    coverage?.[rxcui]?.plans[plan.id];
