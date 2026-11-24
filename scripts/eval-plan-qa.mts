/**
 * Accuracy check for plan questions against the real Claude API (costs a few dollars). Each case's expected answer
 * was found by hand in the contract text or the app's checked facts. Also checks that a second question on the same
 * plan reads the contract from Claude's prompt cache.
 *
 *   npx tsx scripts/eval-plan-qa.mts
 *
 * Uses made-up households only.
 */
import Anthropic from '@anthropic-ai/sdk';
import { KING_COUNTY_PLANS } from '../src/data/kingCounty2027';
import { loadContracts } from '../server/contracts';
import { drugNames, equivalentRxcuis, searchDrugs } from '../server/drugs';
import { loadFormularies, lookupCoverage } from '../server/formularyData';
import { askPlan, type HistoryTurn, type PlanQaDeps, type Reference } from '../server/planQa';

try {
  process.loadEnvFile();
} catch {
  // No .env file.
}

const KAISER = '80473WA1000005';
const PREMERA = '49831WA1940005';
const REGENCE = '87718WA2170013';
const CHPW_SILVER = '18581WA0140002';
const AMBETTER_SILVER = '61836WA0050017';

interface Case {
  plan: string;
  question: string;
  history?: HistoryTurn[];
  /** Every pattern must appear in the answer. */
  mustSay?: RegExp[];
  /** At least one reference of this kind, on this contract page when given. */
  cites?: { kind: Reference['kind']; page?: number };
  notStated?: boolean;
  /** Either a cited "no" or "Not stated" passes. */
  noOrNotStated?: boolean;
  /** This question must read the contract from the cache. */
  expectCacheRead?: boolean;
}

const CASES: Case[] = [
  { plan: KAISER, question: 'What is the annual deductible?', mustSay: [/\$1,700/], cites: { kind: 'contract' } },
  { plan: KAISER, question: 'Is acupuncture covered, and does it need preauthorization?', mustSay: [/not required|no preauthorization|doesn.t need/i], cites: { kind: 'contract', page: 17 }, expectCacheRead: true },
  {
    plan: KAISER,
    question: 'How much is the copay for that with a specialist?',
    history: [{ question: 'Is acupuncture covered?', answer: 'Yes, acupuncture needle treatment is covered without preauthorization.' }],
    mustSay: [/\$40/],
    cites: { kind: 'contract', page: 17 },
    expectCacheRead: true,
  },
  { plan: KAISER, question: 'Is EvergreenHealth Medical Center in network?', mustSay: [/not on the hospital|disagree|confirm/i], cites: { kind: 'facts' }, expectCacheRead: true },
  // Out of scope: a sourced "no" (only enrolled people are covered) or "Not stated" are both acceptable.
  { plan: KAISER, question: "Does this plan pay for my dog's veterinary visits?", mustSay: [/\bno\b|not|doesn.t/i], noOrNotStated: true, expectCacheRead: true },
  { plan: KAISER, question: 'Is atorvastatin covered, and at what tier?', cites: { kind: 'drugs' }, expectCacheRead: true },
  { plan: PREMERA, question: 'How many hearing aids are covered, and how often?', mustSay: [/one hearing aid per ear|one per ear/i, /3 years|three years|36 months/i], cites: { kind: 'contract', page: 45 } },
  { plan: PREMERA, question: 'Is UW Medical Center in Montlake in network?', mustSay: [/in network/i], cites: { kind: 'facts' }, expectCacheRead: true },
  { plan: PREMERA, question: 'What will this plan cost per month in 2031?', notStated: true, expectCacheRead: true },
  { plan: REGENCE, question: 'What is the out-of-pocket maximum for one person?', mustSay: [/\$7,000/], cites: { kind: 'contract' } },
  { plan: REGENCE, question: 'How many spinal manipulation visits are covered per year?', mustSay: [/\b10\b|ten/i], cites: { kind: 'contract', page: 10 }, expectCacheRead: true },
  { plan: CHPW_SILVER, question: 'Is acupuncture covered?', mustSay: [/acupunct/i], cites: { kind: 'contract' } },
  { plan: AMBETTER_SILVER, question: 'Is bariatric surgery covered?', cites: { kind: 'contract' } },
  { plan: AMBETTER_SILVER, question: 'Is Humira covered?', cites: { kind: 'drugs' }, expectCacheRead: true },
  { plan: AMBETTER_SILVER, question: 'Does the plan cover repairs to my car after an accident?', mustSay: [/\bno\b|not|doesn.t/i], noOrNotStated: true, expectCacheRead: true },
];

const anthropic = new Anthropic();
let lastUsage: Anthropic.Usage | null = null;
// Record each answer's usage; the drug-name call goes through beta.messages.parse and isn't counted.
const client = new Proxy(anthropic, {
  get(target, prop, receiver) {
    if (prop !== 'messages') return Reflect.get(target, prop, receiver);
    return {
      create: async (params: Anthropic.MessageCreateParamsNonStreaming) => {
        const response = await target.messages.create(params);
        lastUsage = response.usage;
        return response;
      },
    };
  },
}) as Anthropic;

const formularies = loadFormularies();
const deps: PlanQaDeps = {
  client,
  contracts: loadContracts(),
  plans: KING_COUNTY_PLANS,
  searchDrugs,
  drugCoverage: async (rxcui) => {
    const [ids, names] = await Promise.all([equivalentRxcuis(rxcui), drugNames(rxcui)]);
    return lookupCoverage(formularies, ids, names);
  },
};

console.log = ((log) => (...args: unknown[]) => (String(args[0]).startsWith('plan question') ? undefined : log(...args)))(console.log);

// Optional case numbers to run, e.g. `npx tsx scripts/eval-plan-qa.mts 5 15`.
const only = new Set(process.argv.slice(2).map(Number));
const chosen = [...CASES.entries()].filter(([i]) => !only.size || only.has(i + 1));

let failures = 0;
let costInput = 0;
for (const [i, c] of chosen) {
  const answer = await askPlan(deps, { planId: c.plan, question: c.question, history: c.history, profile: null });
  const usage = lastUsage as Anthropic.Usage | null;
  const text = answer.segments.map((s) => s.text).join('').replace(/\s+/g, ' ').trim();
  const problems: string[] = [];
  for (const re of c.mustSay ?? []) if (!re.test(text)) problems.push(`missing ${re}`);
  if (c.cites && !answer.references.some((r) => r.kind === c.cites!.kind && (c.cites!.page === undefined || r.page === c.cites!.page))) {
    problems.push(`no ${c.cites.kind} citation${c.cites.page ? ` on page ${c.cites.page}` : ''} (got ${answer.references.map((r) => r.kind + (r.page ? ` p${r.page}` : '')).join(', ') || 'none'})`);
  }
  if (c.notStated && !answer.notStated) problems.push('expected "Not stated"');
  if (answer.unsourced) problems.push('no sourced answer');
  else if (!c.notStated && !c.noOrNotStated && answer.notStated) problems.push('said "Not stated"');
  if (c.noOrNotStated && !answer.notStated && !answer.references.length) problems.push('a "no" without citations');
  const read = usage?.cache_read_input_tokens ?? 0;
  const written = usage?.cache_creation_input_tokens ?? 0;
  if (c.expectCacheRead && !read) problems.push('contract not read from the cache');
  costInput += read * 0.2 + written * 8 + (usage?.input_tokens ?? 0) * 4 + (usage?.output_tokens ?? 0) * 20;
  if (problems.length) failures++;
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${i + 1}. [${c.plan}] ${c.question}`);
  console.log(`     ${text.slice(0, 300)}`);
  console.log(`     refs: ${answer.references.map((r) => `${r.kind}${r.page ? ` p${r.page}` : ''}`).join(', ') || 'none'} · cache read ${read}, written ${written}`);
  for (const p of problems) console.log(`     ! ${p}`);
}
console.log(`\n${chosen.length - failures} of ${chosen.length} passed. Approximate cost of the answers: $${(costInput / 1e6).toFixed(2)}.`);
process.exitCode = failures ? 1 : 0;
