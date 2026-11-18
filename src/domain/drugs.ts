import { money } from '../format';
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

/** Where a drug-list answer came from, so the app can explain it. */
export interface ListEvidence {
  /** "drug file" (insurer's machine-readable file) or "drug list PDF" (converted). */
  kind: string;
  url: string;
  planYear: number;
  /** The printed row that matched, for PDF lists. */
  row?: string;
  /** A brand-name drug the list covers only as its generic. */
  asGeneric?: boolean;
  /** Set when the plan's own list isn't published and another plan's list is used. */
  assumption?: string;
}

export interface ListDrugStatus extends PlanDrugStatus {
  evidence: ListEvidence;
}

/**
 * What's known about one drug's coverage, by plan id, saved in the (encrypted) profile since it reveals
 * medications. `plans` holds answers the user set or confirmed (from Healthplanfinder, the insurer, or the
 * pharmacy); `fromLists` holds the automatic lookup in insurers' drug lists. The user's answer wins.
 */
export interface DrugCoverage {
  checkedAt: string;
  source: string;
  plans: Record<string, PlanDrugStatus>;
  fromLists?: Record<string, ListDrugStatus>;
  listsCheckedAt?: string;
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
  (rxcui, plan) => {
    const mine = coverage?.[rxcui]?.plans[plan.id];
    const list = coverage?.[rxcui]?.fromLists?.[plan.id];
    // Your answer wins; it picks up the list's restrictions (such as prior authorization) when it has none and agrees.
    if (mine && list && !mine.restrictions?.length && list.restrictions?.length && mine.covered === list.covered && (!mine.tier || mine.tier === list.tier)) {
      return { ...mine, restrictions: list.restrictions };
    }
    return mine ?? list;
  };

/**
 * The same coverage, as if every drug a plan doesn't list were approved through a formulary exception, at the
 * plan's highest brand tier. Used to show "if approved" costs beside the worst case.
 */
export const ifExceptionApproved =
  (lookup: CoverageLookup): CoverageLookup =>
  (rxcui, plan) => {
    const status = lookup(rxcui, plan);
    return status && !status.covered ? { covered: true, tier: 'nonPreferredBrand' } : status;
  };

/**
 * What one fill costs under a plan's cost share, in words: whether the deductible comes first, and what's paid after.
 * Copays are capped at the drug's price, as in the cost calculation.
 */
export function fillCostText(share: CostShare, price: number, deductible: number): string {
  const full = `full price (${money(price)})`;
  const untilDeductible = `${full} until the ${money(deductible)} deductible is met`;
  if (share.kind === 'copay') {
    const copayHigher = share.amount >= price;
    if (!share.afterDeductible) {
      return copayHigher ? `${full} per fill, since the ${money(share.amount)} copay is more` : `${money(share.amount)} per fill from the first fill`;
    }
    return copayHigher ? `${full} per fill (the ${money(share.amount)} copay after the deductible is more)` : `${untilDeductible}, then ${money(share.amount)} per fill`;
  }
  return `${untilDeductible}, then ${share.rate === 0 ? '$0' : `${Math.round(share.rate * 100)}% (${money(price * share.rate)}) per fill`}`;
}

/** Yearly costs of a plan if one drug it doesn't list were approved by exception: plan id → RxNorm id → costs. */
export type Approvals = Record<string, Record<string, { expectedYear: number | null; badYear: number | null; worstCase: number | null }>>;

/** The same coverage, with only one drug (by RxNorm id) approved by exception, to price that drug on its own. */
export const approveOnly =
  (lookup: CoverageLookup, rxcui: string): CoverageLookup =>
  (id, plan) => (id === rxcui ? ifExceptionApproved(lookup)(id, plan) : lookup(id, plan));

/** A short note on a list answer for plan cards: "from Kaiser's drug list", "as generic", "2026 list", etc. */
export function listNote(status: PlanDrugStatus | undefined): string {
  if (!status || !('evidence' in status)) return status ? 'your answer' : '';
  const e = (status as ListDrugStatus).evidence;
  return ['from drug list', e.asGeneric ? 'as generic' : '', e.planYear < 2027 ? `${e.planYear} list` : '', e.assumption ? 'assumed list' : '']
    .filter(Boolean)
    .join(', ');
}

/** True when the user's answer and the drug list disagree on coverage or tier. */
export function listDisagrees(cov: DrugCoverage | undefined, planId: string): boolean {
  const mine = cov?.plans[planId];
  const list = cov?.fromLists?.[planId];
  if (!mine || !list) return false;
  return mine.covered !== list.covered || (mine.covered && Boolean(mine.tier && list.tier) && mine.tier !== list.tier);
}

/** One line on where a list answer came from, e.g. "Kaiser's 2027 drug list (PDF); row "LIPITOR"". */
export function describeEvidence(carrier: string, e: ListEvidence): string {
  const kind = e.kind === 'drug file' ? 'machine-readable drug list' : 'drug list (PDF)';
  const parts = [`${carrier.replace(/ \(.*\)$/, '')}'s ${e.planYear} ${kind}`];
  if (e.row) parts.push(`row "${e.row}"`);
  if (e.asGeneric) parts.push('covered as the generic');
  if (e.planYear < 2027) parts.push(`the ${e.planYear + 1} list isn't posted yet`);
  if (e.assumption) parts.push(e.assumption);
  return parts.join('; ');
}
