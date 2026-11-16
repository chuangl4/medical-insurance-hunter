/**
 * Checks whether insurers have changed or replaced their drug lists since the last build.
 *
 *   npm run formularies:check            report changes (exit code 1 if anything changed)
 *   npm run formularies:check -- --record  save the current state after rebuilding
 *
 * PDFs are compared by content hash; the large machine-readable files by size and date headers. Each PDF's
 * landing page is also scanned for drug-list links that aren't the one in use (such as a newly posted 2027 list).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { FORMULARY_SOURCES } from '../src/data/formularySources';
import { FORMULARY_DIR } from '../server/formularyData';

const MANIFEST = path.join(FORMULARY_DIR, 'manifest.json');
const UA = 'Mozilla/5.0 (medical-insurance-hunter formulary check)';
const record = process.argv.includes('--record');

type Seen = { hash?: string; size?: string; modified?: string; etag?: string };
const previous: Record<string, Seen> = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')).sources : {};
const current: Record<string, Seen> = {};
const changes: string[] = [];
const leads: string[] = [];

async function headers(url: string): Promise<Seen> {
  const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA } });
  return {
    size: res.headers.get('content-length') ?? undefined,
    modified: res.headers.get('last-modified') ?? undefined,
    etag: res.headers.get('etag') ?? undefined,
  };
}

async function hashOf(url: string): Promise<Seen> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`answered ${res.status}`);
  return { hash: createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex') };
}

/** Drug-list-looking PDF links on a page, other than the one in use. */
async function otherLists(page: string, inUse: string): Promise<string[]> {
  const html = await (await fetch(page, { headers: { 'User-Agent': UA } })).text();
  const base = new URL(page);
  const links = [...html.matchAll(/(?:href|src)=["']([^"']+\.pdf[^"']*)["']/gi)].map((m) => new URL(m[1].replace(/&amp;/g, '&'), base).href);
  const otherState =
    /[-_](A[LKZR]|C[AOT]|D[EC]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[IVY])[-_.]|Georgia|Iowa|Kansas|Maryland|Jersey|Mexico|Carolina|Texas|Florida|Arizona|Colorado|Ohio|Oregon|Illinois|Indiana|Michigan|Tennessee|Wisconsin|Nebraska|Missouri|Mississippi|Alabama|Wyoming|Louisiana|Oklahoma|Virginia|\bnm-|[-_]NY[-_.]/i;
  // Change notices, translations, large print, and directories aren't new drug lists.
  const notAList = /update|change|18pt|large|directory|_SP\b|_SP\.|spanish|espanol/i;
  return [...new Set(links)].filter(
    (u) => u !== inUse && /formular|drug|pdl|rx/i.test(u) && /20(2[7-9]|3\d)/.test(u) && !otherState.test(u) && !notAList.test(u),
  );
}

for (const { carrier, source } of FORMULARY_SOURCES) {
  const urls = source.kind === 'file' ? source.urls : [source.url];
  for (const url of urls) {
    if (current[url]) continue;
    try {
      current[url] = source.kind === 'file' ? await headers(url) : await hashOf(url);
    } catch (error) {
      changes.push(`${carrier}: ${url} could not be fetched (${error instanceof Error ? error.message : error})`);
      continue;
    }
    const before = previous[url];
    if (!before) continue;
    const changed = source.kind === 'file'
      ? (before.etag && before.etag !== current[url].etag) || (before.size && before.size !== current[url].size) || (before.modified && before.modified !== current[url].modified)
      : before.hash !== current[url].hash;
    if (changed) changes.push(`${carrier}: ${url} has changed since it was recorded; rebuild with npm run formularies${source.kind === 'pdf' ? ':pdf' : ''}`);
  }
  if (source.kind === 'pdf') {
    try {
      for (const u of await otherLists(source.page, source.url)) leads.push(`${carrier}: possible newer list ${u}`);
    } catch {
      // The landing page is only a hint; a failure here isn't a change.
    }
  }
}

if (!existsSync(MANIFEST) && !record) console.log('No saved state yet; run with --record after building to start tracking.');
if (record) {
  writeFileSync(MANIFEST, JSON.stringify({ recordedAt: new Date().toISOString(), sources: current }, null, 2));
  console.log(`Recorded the current state of ${Object.keys(current).length} sources.`);
}
for (const line of changes) console.log(`CHANGED  ${line}`);
for (const line of leads) console.log(`LOOK     ${line}`);
if (!changes.length && !leads.length) console.log('No changes found.');
if (changes.length && !record) process.exitCode = 1;
