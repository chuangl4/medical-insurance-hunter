/**
 * One-time conversion of insurers' PDF drug lists into server/formularies/*.json (the same shape as the
 * machine-readable lists, but keyed by drug name). Rerun when an insurer posts a new list.
 *
 *   npm run formularies:pdf -- [--cache <dir>] [--only <carrier substring>] [--legend-only]
 *
 * Steps per document: download, rebuild each page's text lines from positions, read the tier legend once
 * (Claude), copy every page's drug rows as printed (Claude Haiku), map tiers and restriction codes in code, and
 * check completeness page by page. Model answers are cached on disk, so reruns are free.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { getDocumentProxy } from 'unpdf';
import { z } from 'zod';
import { FORMULARY_SOURCES } from '../src/data/formularySources';
import { KING_COUNTY_PLANS } from '../src/data/kingCounty2027';
import { DRUG_TIERS, type DrugTier } from '../src/domain/drugs';
import { FORMULARY_DIR, type CompactFormulary } from '../server/formularyData';

try {
  process.loadEnvFile();
} catch {
  // Use the environment as is.
}

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const cache = arg('--cache') ?? path.join(tmpdir(), 'mih-formulary-cache');
const only = arg('--only')?.toLowerCase();
const legendOnly = process.argv.includes('--legend-only');
mkdirSync(path.join(cache, 'answers'), { recursive: true });

const client = new Anthropic();
const LEGEND_MODEL = 'claude-sonnet-5-5';
const ROW_MODEL = 'claude-haiku-5-5';
const CONCURRENCY = 6;

const slug = (s: string) => s.toLowerCase().replace(/\(.*\)/, '').trim().replace(/[^a-z0-9]+/g, '-');
const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);

async function download(url: string): Promise<Uint8Array> {
  const file = path.join(cache, url.replace(/[^a-zA-Z0-9.]+/g, '_'));
  if (!existsSync(file)) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (medical-insurance-hunter formulary converter)' } });
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return new Uint8Array(readFileSync(file));
}

/** Rebuilds a page's lines from text positions, marking wide gaps (table columns) with " | ". */
async function pageLines(pdf: Awaited<ReturnType<typeof getDocumentProxy>>, n: number): Promise<string> {
  const page = await pdf.getPage(n);
  const content = await page.getTextContent();
  type Item = { str: string; x: number; y: number; w: number };
  const items: Item[] = [];
  for (const it of content.items as { str?: string; transform?: number[]; width?: number }[]) {
    if (!it.str?.trim() || !it.transform) continue;
    items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width ?? 0 });
  }
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Item[][] = [];
  for (const it of items) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line[0].y - it.y) <= 2.5) line.push(it);
    else lines.push([it]);
  }
  return lines
    .map((line) => {
      line.sort((a, b) => a.x - b.x);
      let out = '';
      let end = -Infinity;
      for (const it of line) {
        const gap = it.x - end;
        out += out ? (gap > 14 ? ' | ' : gap > 1 ? ' ' : '') : '';
        out += it.str.trim();
        end = it.x + it.w;
      }
      return out;
    })
    .join('\n');
}

async function cached<T>(key: string, run: () => Promise<T>): Promise<T> {
  const file = path.join(cache, 'answers', `${key}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as T;
  const value = await run();
  writeFileSync(file, JSON.stringify(value));
  return value;
}

const legendSchema = z.object({
  planYear: z.number().int().describe('The plan year the list is for, from its title or effective date'),
  effective: z.string().describe('Effective date as printed, or ""'),
  tiers: z.array(
    z.object({
      label: z.string().describe('The tier value exactly as it appears in the tier column, e.g. "1", "Tier 2", "M", "$0"'),
      meaning: z.string().describe("The legend's description of it"),
      appTier: z.enum([...DRUG_TIERS, 'notCovered', 'medicalBenefit', 'unclear']),
    }),
  ),
  codes: z.array(
    z.object({
      code: z.string().describe('A requirement or limit code as printed in the notes column, e.g. "PA", "QL", "ST", "SP"'),
      meaning: z.string(),
      restriction: z.enum(['priorAuth', 'stepTherapy', 'quantityLimit', 'none']),
    }),
  ),
});
type Legend = z.infer<typeof legendSchema>;

const rowsSchema = z.object({
  rows: z.array(
    z.object({
      name: z.string().describe('Drug name exactly as printed, including any strength, form, or generic name in parentheses'),
      tier: z.string().describe('The tier cell exactly as printed'),
      notes: z.string().describe('The requirements/limits cell exactly as printed, or ""'),
    }),
  ),
});

async function ask<T>(model: string, schema: z.ZodType<T>, system: string, text: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await client.beta.messages.parse({
        model,
        max_tokens: 16000,
        // Plain transcription and lookup; no reasoning needed. Sonnet 5.5 spells "off" differently from Haiku 5.5.
        thinking: { type: model.startsWith('claude-sonnet-5-5') ? 'between_tools' : 'disabled' },
        output_config: { effort: 'low', format: betaZodOutputFormat(schema) },
        system,
        messages: [{ role: 'user', content: text }],
      } as Parameters<typeof client.beta.messages.parse>[0]);
      if (res.parsed_output) return res.parsed_output as T;
      throw new Error(`no output (stop reason ${res.stop_reason})`);
    } catch (error) {
      if (attempt >= 3) throw error;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

const LEGEND_SYSTEM = `You read the explanatory pages of a US health insurer's drug list (formulary). Report the plan year, the tier values used in the tier column and what each means, and the codes used in the requirements/limits column. Map each tier to the closest app tier: preventive ($0 cost share), generic, preferredBrand, nonPreferredBrand, specialty; notCovered if the label means excluded; medicalBenefit if covered under the medical benefit rather than the pharmacy benefit; unclear otherwise. When tiers are numbered without names, use the legend's descriptions. Map codes to priorAuth, stepTherapy, quantityLimit, or none.`;

const ROWS_SYSTEM = `You copy drug rows from one page of a drug list table. Each line of input is one printed line; " | " separates columns. A row is a drug name followed by its tier and, sometimes, notes (requirements/limits). Copy every drug row on the page, exactly as printed, in order. When a drug name wraps onto the next line without a tier, join it into one name. Skip page headers, column headings, therapeutic category headings, legends, and footers. Return no rows if the page has no drug table.`;

const restrictionFlags = (notes: string, legend: Legend): number => {
  let flags = 0;
  const tokens = notes.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  for (const c of legend.codes) {
    if (c.restriction === 'none') continue;
    if (tokens.includes(c.code.toUpperCase().replace(/[^A-Z0-9]/g, ''))) flags |= { priorAuth: 1, stepTherapy: 2, quantityLimit: 4 }[c.restriction];
  }
  return flags;
};

/** Tier labels the legend reading left unclear, decided by hand after reading the legend text. */
const TIER_OVERRIDES: Record<string, Record<string, DrugTier>> = {
  // "Oral chemotherapy, covered at a level comparable to office-administered cancer drugs."
  'Kaiser Permanente': { c: 'specialty' },
  // The rows print "PREV" for the legend's "Tier 1 - Preventive drugs".
  Molina: { prev: 'preventive' },
};

/** Index pages at the back list names with page numbers ("HERCEPTIN ....30"), not tiers. */
const isIndexPage = (text: string) => (text.match(/\.{4,}\s*\d+/g) ?? []).length >= 10;

/**
 * Splits a tier cell that also holds notes ("Tier 2 | MAIL", "4 PA; QL", "Tier 2 (Min 6 Years)") into the tier
 * label and the rest, using the labels the legend knows.
 */
function splitTierCell(cell: string, known: (label: string) => boolean): { label: string; rest: string } {
  const plain = cell.replace(/\([^)]*\)/g, ' ');
  const parts = plain.split(/\s*[|;]\s*/).filter(Boolean);
  const first = parts[0] ?? '';
  if (known(first)) return { label: first, rest: parts.slice(1).join(' ') };
  const words = first.split(/\s+/);
  for (let n = Math.min(2, words.length); n >= 1; n--) {
    const label = words.slice(0, n).join(' ');
    if (known(label)) return { label, rest: [...words.slice(n), ...parts.slice(1)].join(' ') };
  }
  return { label: cell, rest: '' };
}

const normLabel = (s: string) => s.toLowerCase().replace(/\btier\b/g, '').replace(/[^a-z0-9$]/g, '');

for (const { carrier, source } of FORMULARY_SOURCES) {
  if (source.kind !== 'pdf' || (only && !carrier.toLowerCase().includes(only))) continue;
  console.log(`\n${carrier}: ${source.title}`);
  const bytes = await download(source.url);
  const docKey = hash(Buffer.from(bytes).toString('base64'));
  const pdf = await getDocumentProxy(bytes);
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) pages.push(await pageLines(pdf, n));
  console.log(`  ${pdf.numPages} pages`);

  // Legend: the first pages plus any page that explains tiers or abbreviations.
  const legendPages = pages
    .map((t, i) => ({ t, i }))
    .filter(({ t, i }) => i < 6 || /(KEY|Abbreviation|Legend|Tier\s*1\b.*Tier\s*2|What do the (tiers|codes))/i.test(t))
    .slice(0, 10);
  const legend = await cached(`${docKey}-legend`, () =>
    ask(LEGEND_MODEL, legendSchema, LEGEND_SYSTEM, legendPages.map(({ t, i }) => `--- page ${i + 1} ---\n${t}`).join('\n\n')),
  );
  console.log(`  plan year ${legend.planYear}, effective "${legend.effective}"`);
  for (const t of legend.tiers) console.log(`    tier "${t.label}" = ${t.appTier}  (${t.meaning.slice(0, 80)})`);
  for (const c of legend.codes) console.log(`    code "${c.code}" = ${c.restriction}  (${c.meaning.slice(0, 60)})`);
  if (legendOnly) continue;

  const tierOf = new Map<string, string>(legend.tiers.map((t) => [normLabel(t.label), t.appTier]));
  for (const [label, tier] of Object.entries(TIER_OVERRIDES[carrier] ?? {})) tierOf.set(normLabel(label), tier);
  const rows: [string, DrugTier, number][] = [];
  const unknownTiers = new Map<string, number>();
  const suspicious: string[] = [];
  let done = 0;
  const queue = pages.map((text, i) => ({ text, i }));
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const { text, i } = job;
        if (text.trim().length < 20 || isIndexPage(text)) {
          done++;
          continue;
        }
        let result = await cached(`${docKey}-p${i + 1}`, () => ask(ROW_MODEL, rowsSchema, ROWS_SYSTEM, text));
        // Lines that end in a known tier value are almost certainly rows; far fewer rows than that means misses.
        const likely = text.split('\n').filter((l) => {
          const cells = l.split(' | ');
          return cells.length >= 2 && cells.slice(1).some((c) => tierOf.has(normLabel(c)));
        }).length;
        if (likely >= 5 && result.rows.length < likely * 0.8) {
          // Read the page again with the stronger model and keep whichever found more rows.
          const retry = await cached(`${docKey}-p${i + 1}-retry`, () => ask(LEGEND_MODEL, rowsSchema, ROWS_SYSTEM, text));
          if (retry.rows.length > result.rows.length) result = retry;
          if (result.rows.length < likely * 0.8) suspicious.push(`page ${i + 1}: ${result.rows.length} rows, ~${likely} expected`);
        }
        for (const r of result.rows) {
          const { label, rest } = splitTierCell(r.tier, (l) => tierOf.has(normLabel(l)));
          r.notes = [rest, r.notes].filter(Boolean).join(' ');
          const tier = tierOf.get(normLabel(label)) as DrugTier | 'notCovered' | 'medicalBenefit' | 'unclear' | undefined;
          if (!tier || tier === 'unclear' || tier === 'medicalBenefit') {
            unknownTiers.set(r.tier, (unknownTiers.get(r.tier) ?? 0) + 1);
            continue;
          }
          if (tier === 'notCovered') continue;
          rows.push([r.name.replace(/\s+/g, ' ').trim(), tier, restrictionFlags(r.notes, legend)]);
        }
        if (++done % 25 === 0) console.log(`  … ${done}/${pages.length} pages`);
      }
    }),
  );

  const planIds = KING_COUNTY_PLANS.filter((p) => p.carrier === carrier).map((p) => p.id);
  const formulary: CompactFormulary = {
    carrier,
    sourceUrl: source.url,
    sourceKind: 'drug list PDF',
    builtAt: new Date().toISOString(),
    planYear: legend.planYear,
    planIds,
    drugs: {},
    rows: rows.sort((a, b) => a[0].localeCompare(b[0])),
  };
  writeFileSync(path.join(FORMULARY_DIR, `${slug(carrier)}.json`), JSON.stringify(formulary));
  console.log(`  ${rows.length} rows for ${planIds.length} plans -> server/formularies/${slug(carrier)}.json`);
  if (unknownTiers.size) console.log(`  rows skipped for unmapped tiers: ${JSON.stringify(Object.fromEntries(unknownTiers))}`);
  if (suspicious.length) console.log(`  CHECK these pages for missed rows:\n    ${suspicious.join('\n    ')}`);
}
