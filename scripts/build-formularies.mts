/**
 * Rebuilds server/formularies/*.json from insurers' machine-readable drug files (drugs.json).
 * Run with `npm run formularies` (the files are large, so it needs extra memory). Pass `--cache <dir>` to reuse
 * downloads between runs.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FORMULARY_SOURCES } from '../src/data/formularySources';
import { KING_COUNTY_PLANS } from '../src/data/kingCounty2027';
import { compactFromCms, FORMULARY_DIR } from '../server/formularyData';

const PLAN_YEAR = 2027;
const cacheArg = process.argv.indexOf('--cache');
const cache = cacheArg > 0 ? process.argv[cacheArg + 1] : path.join(tmpdir(), 'mih-formulary-cache');
mkdirSync(cache, { recursive: true });
mkdirSync(FORMULARY_DIR, { recursive: true });

const slug = (s: string) => s.toLowerCase().replace(/\(.*\)/, '').trim().replace(/[^a-z0-9]+/g, '-');

async function download(url: string): Promise<string> {
  const file = path.join(cache, url.replace(/[^a-zA-Z0-9.]+/g, '_'));
  if (existsSync(file)) return file;
  process.stdout.write(`  downloading ${url} … `);
  const res = await fetch(url, { headers: { 'User-Agent': 'medical-insurance-hunter formulary builder' } });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log('done');
  return file;
}

let failed = false;
for (const { carrier, source } of FORMULARY_SOURCES) {
  if (source.kind !== 'file') continue;
  console.log(`${carrier}:`);
  const planIds = KING_COUNTY_PLANS.filter((p) => p.carrier === carrier).map((p) => p.id);
  const files = [];
  for (const url of source.urls) files.push(JSON.parse(readFileSync(await download(url), 'utf8')));
  const { formulary, unknownTiers } = compactFromCms(files, { carrier, sourceUrl: source.urls.join(' '), planIds, planYear: PLAN_YEAR });
  const missing = planIds.filter((id) => !formulary.planIds.includes(id));
  const out = path.join(FORMULARY_DIR, `${slug(carrier)}.json`);
  writeFileSync(out, JSON.stringify(formulary));
  console.log(`  ${formulary.planIds.length} of ${planIds.length} plans, ${Object.keys(formulary.drugs).length} drugs -> ${path.relative(process.cwd(), out)}`);
  if (missing.length) console.log(`  not in the file (need another source): ${missing.join(', ')}`);
  if (Object.keys(unknownTiers).length) {
    failed = true;
    console.log(`  UNKNOWN TIER NAMES, add them to TIER_NAMES: ${JSON.stringify(unknownTiers)}`);
  }
}
if (failed) process.exitCode = 1;
