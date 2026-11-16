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
  /**
   * For lists converted from PDFs, which name drugs rather than RxNorm ids: [name as printed, tier, flags], the
   * same for every plan in `planIds`.
   */
  rows?: [string, DrugTier, number][];
  /** Plans given another plan's list because their own isn't published, with why. */
  assumed?: Record<string, string>;
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

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Dosage-form families, so an eye drop doesn't match a tablet row for the same ingredient. */
const FORMS: [string, RegExp][] = [
  ['eye', /\b(ophthalmic|ophth|eye)\b/],
  ['ear', /\b(otic|ear)\b/],
  ['nose', /\b(nasal|nose)\b/],
  ['inhaled', /\b(inhal\w*|nebuli\w*|aerosol)\b/],
  ['skin', /\b(topical|cream|ointment|gel|lotion|transdermal|patch|foam|shampoo)\b/],
  ['injected', /\b(inject\w*|syringe|pen|vial|auto ?injector|subcutaneous|intramuscular|intravenous)\b/],
  ['vaginal', /\b(vaginal|vag)\b/],
  ['rectal', /\b(rectal|suppositor\w*|enema)\b/],
  ['oral', /\b(oral|tablet|tab|capsule|cap|chewable|odt|elixir|syrup|suspension)\b/],
];
const formOf = (text: string): string | null => FORMS.find(([, re]) => re.test(text))?.[0] ?? null;

export interface NamedDrug {
  name: string;
  brand: boolean;
  ingredients: string[];
  brands: string[];
}

/**
 * The drug-list row that covers a drug, matched by brand or ingredient name and dosage form. A brand-name drug
 * that only matches a generic row is covered as its generic.
 */
export function matchRow(rows: [string, DrugTier, number][], drug: NamedDrug): { row: [string, DrugTier, number]; asGeneric: boolean } | null {
  const name = norm(drug.name);
  const form = formOf(name);
  const brands = drug.brands.map(norm).filter(Boolean);
  const ingredients = drug.ingredients.map(norm).filter(Boolean);
  if (!ingredients.length && !brands.length) return null;
  const startsWith = (text: string, word: string) => text === word || text.startsWith(`${word} `);
  const extended = (t: string) => /\b(er|xr|xl|sr|cr|dr|la|extended|delayed|24 hr|12 hr|osmotic)\b/.test(t);
  const strengths = (t: string) => new Set(t.match(/\d+(\.\d+)?/g) ?? []);
  const drugStrengths = strengths(name);
  const tierRank = (t: DrugTier) => ['preventive', 'generic', 'preferredBrand', 'nonPreferredBrand', 'specialty'].indexOf(t);

  // Score each matching row: brand rows for a brand drug first, then same release type, then same strength.
  let best: { row: [string, DrugTier, number]; asGeneric: boolean; score: number } | null = null;
  for (const row of rows) {
    const text = norm(row[0]);
    const rowForm = formOf(text);
    if (form && rowForm && rowForm !== form) continue;
    const brandHit = brands.some((b) => startsWith(text, b));
    const head = text.split(/\b(oral|ophth\w*|topical|inject\w*|nasal|tab\w*|cap\w*|sol\w*|\d)/)[0];
    const ingredientHit = ingredients.length === 1 ? startsWith(text, ingredients[0]) : ingredients.every((i) => head.includes(i));
    if (!brandHit && !ingredientHit) continue;
    const asGeneric = drug.brand && !brandHit;
    let score = brandHit && drug.brand ? 100 : 0;
    score += extended(text) === extended(name) ? 20 : 0;
    if ([...strengths(text)].some((n) => drugStrengths.has(n))) score += 10;
    if (rowForm === form) score += 5;
    // Same product form within the family: tablet vs suspension, pen vs vial, and so on.
    const subform = /\b(tablet|tab|capsule|cap|suspension|solution|chewable|granules|packet|pen|syringe|vial|auto injector|cream|ointment|gel|patch)\b/;
    const want = name.match(subform)?.[1];
    if (want && new RegExp(`\\b${want === 'tablet' ? 'tab' : want === 'capsule' ? 'cap' : want}`).test(text)) score += 3;
    score -= tierRank(row[1]); // Among equals, the cheaper listing.
    if (!best || score > best.score) best = { row, asGeneric, score };
  }
  return best ? { row: best.row, asGeneric: best.asGeneric } : null;
}

export interface FoundCoverage extends PlanDrugStatus {
  carrier: string;
  source: CompactFormulary['sourceKind'];
  sourceUrl: string;
  builtAt: string;
  /** The RxNorm id the list matched: the drug itself, or an equivalent product such as its generic. */
  matchedRxcui: string;
  /** For printed lists: the row that matched, as printed. */
  matchedRow?: string;
  /** A brand-name drug the list covers only as its generic. */
  asGeneric?: boolean;
  /** The list is from another plan year (an insurer hasn't posted its new list yet). */
  planYear: number;
  /** Set when this plan's own list isn't published and another plan's is used instead. */
  assumption?: string;
}

/**
 * Coverage of one drug on every plan the loaded lists cover. `rxcuis` is the drug first, then equivalent products;
 * an exact match wins over an equivalent one for the same plan.
 */
export function lookupCoverage(formularies: CompactFormulary[], rxcuis: string[], names?: NamedDrug): Record<string, FoundCoverage> {
  const out: Record<string, FoundCoverage> = {};
  for (const f of formularies) {
    const base = { carrier: f.carrier, source: f.sourceKind, sourceUrl: f.sourceUrl, builtAt: f.builtAt, planYear: f.planYear };
    for (const id of f.planIds) out[id] = { ...base, covered: false, matchedRxcui: rxcuis[0] };
    if (f.rows) {
      const hit = names ? matchRow(f.rows, names) : null;
      if (hit) {
        const [row, tier, flags] = hit.row;
        const restrictions = restrictionsOf(flags);
        for (const id of f.planIds) {
          out[id] = { ...base, covered: true, tier, ...(restrictions.length ? { restrictions } : {}), matchedRxcui: rxcuis[0], matchedRow: row, ...(hit.asGeneric ? { asGeneric: true } : {}) };
        }
      }
      continue;
    }
    for (const rxcui of [...rxcuis].reverse()) {
      for (const [i, tier, flags] of f.drugs[rxcui] ?? []) {
        const restrictions = restrictionsOf(flags);
        // A brand-name drug found only under its generic's id is covered as the generic.
        const asGeneric = Boolean(names?.brand) && rxcui !== rxcuis[0];
        out[f.planIds[i]] = { ...base, covered: true, tier, ...(restrictions.length ? { restrictions } : {}), matchedRxcui: rxcui, ...(asGeneric ? { asGeneric } : {}) };
      }
    }
  }
  for (const f of formularies) for (const [id, why] of Object.entries(f.assumed ?? {})) if (out[id]) out[id].assumption = why;
  return out;
}

/** Built drug lists shipped with the server (public data, regenerated by `npm run formularies`). */
export const FORMULARY_DIR = path.resolve(import.meta.dirname, 'formularies');

export function loadFormularies(dir = FORMULARY_DIR): CompactFormulary[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
      .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as CompactFormulary);
  } catch {
    return [];
  }
}
