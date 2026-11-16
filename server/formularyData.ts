import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { DrugTier, PlanDrugStatus, Restriction } from '../src/domain/drugs';

/**
 * Drug lists in one compact shape, whatever they came from (an insurer's machine-readable drugs.json, or a
 * converted PDF). Only the plans the app shows are kept. A drug missing for a listed plan means that plan doesn't
 * cover it, since the lists are complete.
 */
export interface CompactFormulary {
  carrier: string;
  sourceUrl: string;
  /** "drug file" (insurer's machine-readable file) or "drug list PDF" (converted). */
  sourceKind: 'drug file' | 'drug list PDF';
  builtAt: string;
  planYear: number;
  planIds: string[];
  /** RxNorm id -> one entry per covering plan: [plan index, tier, restriction flags (PA=1, ST=2, QL=4)]. */
  drugs: Record<string, [number, DrugTier, number][]>;
}

/** Tier names seen in insurers' files, mapped to the app's tiers. Unknown names are reported, not guessed. */
const TIER_NAMES: Record<string, DrugTier> = {
  GENERIC: 'generic',
  PREFERREDGENERIC: 'generic',
  NONPREFERREDGENERIC: 'generic',
  PREFERREDBRAND: 'preferredBrand',
  NONPREFERREDBRAND: 'nonPreferredBrand',
  NONPREFERREDGENERICNONPREFERREDBRAND: 'nonPreferredBrand',
  SPECIALTY: 'specialty',
  SPECIALTYDRUGS: 'specialty',
  PREFERREDSPECIALTY: 'specialty',
  NONPREFERREDSPECIALTY: 'specialty',
  ZEROCOSTSHAREPREVENTIVE: 'preventive',
  ZEROCOSTSHAREPREVENTIVEDRUGS: 'preventive',
};

export const tierFromName = (name: string): DrugTier | undefined => TIER_NAMES[name.toUpperCase().replace(/[^A-Z]/g, '')];

const FLAG = { priorAuth: 1, stepTherapy: 2, quantityLimit: 4 } as const;

interface CmsDrug {
  rxnorm_id: string;
  plans?: {
    plan_id: string;
    drug_tier: string;
    years?: number[];
    prior_authorization?: boolean;
    step_therapy?: boolean;
    quantity_limit?: boolean;
  }[];
}

/** Builds the compact form from one or more drugs.json arrays, keeping only the given plans and year. */
export function compactFromCms(
  files: CmsDrug[][],
  opts: { carrier: string; sourceUrl: string; planIds: string[]; planYear: number; builtAt?: string },
): { formulary: CompactFormulary; unknownTiers: Record<string, number> } {
  const wanted = new Set(opts.planIds);
  const found = new Set<string>();
  const rows = new Map<string, Map<string, [DrugTier, number]>>();
  const unknownTiers: Record<string, number> = {};
  for (const file of files) {
    for (const drug of file) {
      for (const p of drug.plans ?? []) {
        if (!wanted.has(p.plan_id) || !(p.years ?? []).includes(opts.planYear)) continue;
        found.add(p.plan_id);
        const tier = tierFromName(p.drug_tier);
        if (!tier) {
          unknownTiers[p.drug_tier] = (unknownTiers[p.drug_tier] ?? 0) + 1;
          continue;
        }
        const flags = (p.prior_authorization ? FLAG.priorAuth : 0) | (p.step_therapy ? FLAG.stepTherapy : 0) | (p.quantity_limit ? FLAG.quantityLimit : 0);
        (rows.get(drug.rxnorm_id) ?? rows.set(drug.rxnorm_id, new Map()).get(drug.rxnorm_id)!).set(p.plan_id, [tier, flags]);
      }
    }
  }
  const planIds = opts.planIds.filter((id) => found.has(id));
  const index = new Map(planIds.map((id, i) => [id, i]));
  const drugs: CompactFormulary['drugs'] = {};
  for (const [rxcui, byPlan] of [...rows].sort(([a], [b]) => a.localeCompare(b))) {
    drugs[rxcui] = [...byPlan].map(([planId, [tier, flags]]) => [index.get(planId)!, tier, flags]);
  }
  return {
    formulary: {
      carrier: opts.carrier,
      sourceUrl: opts.sourceUrl,
      sourceKind: 'drug file',
      builtAt: opts.builtAt ?? new Date().toISOString(),
      planYear: opts.planYear,
      planIds,
      drugs,
    },
    unknownTiers,
  };
}

const restrictionsOf = (flags: number): Restriction[] =>
  (Object.keys(FLAG) as Restriction[]).filter((r) => flags & FLAG[r]);

export interface FoundCoverage extends PlanDrugStatus {
  carrier: string;
  source: CompactFormulary['sourceKind'];
  sourceUrl: string;
  builtAt: string;
  /** The RxNorm id the list matched: the drug itself, or an equivalent product such as its generic. */
  matchedRxcui: string;
}

/**
 * Coverage of one drug on every plan the loaded lists cover. `rxcuis` is the drug first, then equivalent products;
 * an exact match wins over an equivalent one for the same plan.
 */
export function lookupCoverage(formularies: CompactFormulary[], rxcuis: string[]): Record<string, FoundCoverage> {
  const out: Record<string, FoundCoverage> = {};
  for (const f of formularies) {
    const base = { carrier: f.carrier, source: f.sourceKind, sourceUrl: f.sourceUrl, builtAt: f.builtAt };
    for (const id of f.planIds) out[id] = { ...base, covered: false, matchedRxcui: rxcuis[0] };
    for (const rxcui of [...rxcuis].reverse()) {
      for (const [i, tier, flags] of f.drugs[rxcui] ?? []) {
        const restrictions = restrictionsOf(flags);
        out[f.planIds[i]] = { ...base, covered: true, tier, ...(restrictions.length ? { restrictions } : {}), matchedRxcui: rxcui };
      }
    }
  }
  return out;
}

/** Built drug lists shipped with the server (public data, regenerated by `npm run formularies`). */
export const FORMULARY_DIR = path.resolve(import.meta.dirname, 'formularies');

export function loadFormularies(dir = FORMULARY_DIR): CompactFormulary[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as CompactFormulary);
  } catch {
    return [];
  }
}
