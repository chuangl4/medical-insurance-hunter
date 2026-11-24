/**
 * Downloads each plan's 2027 contract listed in src/data/contractSources.ts, extracts its text page by page, checks
 * that it's the right document (2027, the plan's tier, the plan's deductible and out-of-pocket maximum), and writes
 * the ones that pass to server/contracts/<slug>.json for the plan question box.
 *
 *   npm run contracts
 *
 * Downloads are cached in CONTRACT_CACHE (default: the OS temp folder). Sites that refuse plain downloads are
 * reported and left out; nothing here tries to get around them.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractText, getDocumentProxy } from 'unpdf';
import { CONTRACT_SOURCES, type ContractSource } from '../src/data/contractSources';
import { KING_COUNTY_PLANS } from '../src/data/kingCounty2027';
import { CONTRACT_DIR, verifyContract, type Contract } from '../server/contracts';

const CACHE = process.env.CONTRACT_CACHE ?? path.join(os.tmpdir(), 'mih-contract-cache');
mkdirSync(CACHE, { recursive: true });
mkdirSync(CONTRACT_DIR, { recursive: true });

async function download(url: string): Promise<Uint8Array | string> {
  const file = path.join(CACHE, createHash('sha256').update(url).digest('hex').slice(0, 24) + '.pdf');
  if (existsSync(file)) return new Uint8Array(readFileSync(file));
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
    if (!res.ok) return `HTTP ${res.status}`;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (new TextDecoder().decode(buf.slice(0, 5)) !== '%PDF-') return `not a PDF (${res.headers.get('content-type') ?? 'unknown type'})`;
    writeFileSync(file, buf);
    return buf;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

const bySlug = new Map<string, { source: ContractSource; planIds: string[] }>();
for (const [planId, source] of Object.entries(CONTRACT_SOURCES)) {
  const entry = bySlug.get(source.slug) ?? { source, planIds: [] };
  entry.planIds.push(planId);
  bySlug.set(source.slug, entry);
}

const report: string[] = [];
let loaded = 0;
for (const { source, planIds } of bySlug.values()) {
  const buf = await download(source.url);
  if (typeof buf === 'string') {
    report.push(`SKIPPED ${source.slug}: download failed (${buf})`);
    continue;
  }
  const { text: pages } = await extractText(await getDocumentProxy(new Uint8Array(buf)), { mergePages: false });
  const passed: string[] = [];
  for (const id of planIds) {
    const plan = KING_COUNTY_PLANS.find((p) => p.id === id);
    if (!plan) {
      report.push(`LEFT OUT ${id} (${source.slug}): not in the King County plan list`);
      continue;
    }
    const problems = verifyContract(pages, plan, { sharedName: source.shared ? 'Cascade Select' : undefined, yearFromAddress: source.yearFromAddress });
    if (problems.length) report.push(`LEFT OUT ${id} ${plan.name} (${source.slug}): ${problems.join('; ')}`);
    else passed.push(id);
  }
  if (!passed.length) continue;
  const contract: Contract = {
    slug: source.slug,
    planIds: passed,
    url: source.url,
    title: source.title,
    insurer: source.insurer,
    planYear: 2027,
    checked: source.checked,
    builtAt: new Date().toISOString(),
    sha256: createHash('sha256').update(buf).digest('hex'),
    pages: pages.map((p) => p.replace(/[ \t]+/g, ' ').trim()),
  };
  writeFileSync(path.join(CONTRACT_DIR, `${source.slug}.json`), JSON.stringify(contract) + '\n');
  loaded += passed.length;
  report.push(`ok ${source.slug}: ${pages.length} pages, plans ${passed.join(', ')}`);
}

console.log(report.join('\n'));
console.log(`\n${loaded} of ${Object.keys(CONTRACT_SOURCES).length} plans have a checked contract in ${path.relative(process.cwd(), CONTRACT_DIR)}/`);
