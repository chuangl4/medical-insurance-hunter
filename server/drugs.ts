import type { DrugRef } from '../src/domain/drugs';

const RXNAV = 'https://rxnav.nlm.nih.gov/REST';
const TIMEOUT_MS = 15_000;
/** Branded and generic clinical drugs, and packs, which carry a strength and form. */
const KINDS = ['SBD', 'SCD', 'BPCK', 'GPCK'];

export interface DrugOption extends DrugRef {
  /** True for a brand-name product. */
  brand: boolean;
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`RxNav answered ${res.status}`);
  return res.json();
}

type DrugsResponse = { drugGroup?: { conceptGroup?: { tty: string; conceptProperties?: { rxcui: string; name: string }[] }[] } };

/**
 * Turns an RxNav drugs.json response into options, brands and generics alike, most likely first: single-drug
 * products before combinations, then generic before brand (brand first when the search was a brand name), then
 * tablets and capsules, then lowest strength. Exported for tests.
 */
export function toOptions(data: DrugsResponse, query = ''): DrugOption[] {
  const q = query.trim().toLowerCase();
  const all = (data.drugGroup?.conceptGroup ?? [])
    .filter((g) => KINDS.includes(g.tty))
    .flatMap((g) => (g.conceptProperties ?? []).map((c) => ({ rxcui: c.rxcui, name: c.name, brand: g.tty === 'SBD' || g.tty === 'BPCK' })));
  const brandSearch = q !== '' && all.some((o) => o.brand && (o.name.match(/\[([^\]]+)\]$/)?.[1].toLowerCase() ?? '').startsWith(q));
  const rank = (o: DrugOption) => {
    const combo = / \/ /.test(o.name.replace(/\[.*\]$/, '').replace(/\d+(\.\d+)?\s*\w+\/\w+/g, '')) ? 1 : 0;
    const startsWithQuery = q && o.name.toLowerCase().startsWith(q) ? 0 : 1;
    const brandOrder = brandSearch ? (o.brand ? 0 : 1) : o.brand ? 1 : 0;
    const pill = /\b(Tablet|Capsule)\b/.test(o.name) ? 0 : 1;
    return [combo, startsWithQuery, brandOrder, pill, parseFloat(o.name.match(/\d+(\.\d+)?/)?.[0] ?? '0')];
  };
  const cmp = (a: DrugOption, b: DrugOption) => {
    const [x, y] = [rank(a), rank(b)];
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return a.name.localeCompare(b.name);
  };
  return all.sort(cmp).slice(0, 40);
}

/** Looks a medication up in RxNorm by name, correcting spelling when the exact name finds nothing. */
export async function searchDrugs(name: string): Promise<{ query: string; options: DrugOption[] }> {
  const exact = toOptions((await getJson(`${RXNAV}/drugs.json?name=${encodeURIComponent(name)}`)) as DrugsResponse, name);
  if (exact.length) return { query: name, options: exact };
  const approx = (await getJson(`${RXNAV}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=5`)) as {
    approximateGroup?: { candidate?: { name?: string }[] };
  };
  const corrected = approx.approximateGroup?.candidate?.find((c) => c.name)?.name;
  if (!corrected || corrected.toLowerCase() === name.toLowerCase()) return { query: name, options: [] };
  return { query: corrected, options: toOptions((await getJson(`${RXNAV}/drugs.json?name=${encodeURIComponent(corrected)}`)) as DrugsResponse, corrected) };
}

/** The drug itself first, then the same drug in other forms (brand <-> generic, packs), from RxNorm. */
export async function equivalentRxcuis(rxcui: string): Promise<string[]> {
  const data = (await getJson(`${RXNAV}/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=${KINDS.join('+')}`)) as {
    relatedGroup?: { conceptGroup?: { conceptProperties?: { rxcui: string }[] }[] };
  };
  const related = (data.relatedGroup?.conceptGroup ?? []).flatMap((g) => (g.conceptProperties ?? []).map((c) => c.rxcui));
  return [rxcui, ...new Set(related.filter((id) => id !== rxcui))];
}

export interface DrugNames {
  /** The product's full RxNorm name, e.g. "atorvastatin 10 MG Oral Tablet [Lipitor]". */
  name: string;
  brand: boolean;
  /** Ingredient names; a combination product has several. */
  ingredients: string[];
  brands: string[];
}

/** Names a printed drug list might use for this product, from RxNorm. */
export async function drugNames(rxcui: string): Promise<DrugNames> {
  const [props, related] = (await Promise.all([
    getJson(`${RXNAV}/rxcui/${encodeURIComponent(rxcui)}/properties.json`),
    getJson(`${RXNAV}/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=IN+MIN+BN`),
  ])) as [
    { properties?: { name?: string; tty?: string } },
    { relatedGroup?: { conceptGroup?: { tty: string; conceptProperties?: { name: string }[] }[] } },
  ];
  const groups = related.relatedGroup?.conceptGroup ?? [];
  const names = (tty: string) => groups.filter((g) => g.tty === tty).flatMap((g) => (g.conceptProperties ?? []).map((c) => c.name));
  const min = names('MIN');
  return {
    name: props.properties?.name ?? '',
    brand: props.properties?.tty === 'SBD' || props.properties?.tty === 'BPCK',
    // A combination's ingredients come from its MIN entry ("amlodipine / benazepril").
    ingredients: min.length ? min[0].split(/\s*\/\s*/) : names('IN'),
    brands: names('BN'),
  };
}
