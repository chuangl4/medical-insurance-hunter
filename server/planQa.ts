import type Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { FACILITIES, FACILITY_SOURCE } from '../src/data/facilityNetworks';
import { LIST_STATUS_LABELS } from '../src/data/hospitalLists';
import { NETWORK_RULES_BUILT } from '../src/data/networkRules';
import { RESTRICTION_LABELS, TIER_LABELS } from '../src/domain/drugs';
import { facilityAccess } from '../src/domain/hospitalAccess';
import { OUT_OF_NETWORK_TEXT, PRIOR_APPROVAL_LABELS, REFERRAL_TEXT, URGENT_AWAY_TEXT, networkRulesFor, networkTypeOf } from '../src/domain/networkRules';
import { CATEGORY_LABELS, MEDICATION_CATEGORIES, isCandidate, type Profile } from '../src/domain/profile';
import type { Plan } from '../src/domain/types';
import { costShareText } from '../src/format';
import type { Contract } from './contracts';
import type { DrugOption } from './drugs';
import type { FoundCoverage } from './formularyData';

/**
 * Questions about one plan, answered only from documents the server supplies: the plan's 2027 contract, the app's
 * checked facts about the plan, and drug-list lookups. Claude cites every claim (the Citations API), and an answer
 * with no citations is replaced unless it says the documents don't cover the question.
 *
 * Request layout, for prompt caching: the instructions, the contract and the checked facts are the same for everyone
 * asking about a plan, and the cache marker sits on the checked facts. Everything about the asker (their household,
 * the drugs they asked about, the question) comes after it, so all users share one cached copy of each contract.
 */

const MODEL = 'claude-opus-5-5';
const EXTRACT_MODEL = 'claude-haiku-5-5';
const MAX_ANSWER_TOKENS = 2000;
/** Drugs from one question that are looked up, beyond the household's own. */
const MAX_ASKED_DRUGS = 4;
export const NOT_STATED = 'Not stated:';

export class NoContractError extends Error {}
export class AnswerRefusedError extends Error {}

export const SYSTEM = `You answer questions about one Washington State health insurance plan for 2027, for a household choosing a plan.

Use only the documents in the message:
1. The plan's 2027 contract (its policy, Evidence of Coverage or benefit booklet), in reading order, split into short pieces.
2. Checked facts about the plan from this app: hospital network status, network rules, and costs, each with its source and the date it was checked.
3. Drug-list lookups for the medications in question.

Rules:
- Every factual statement must be supported by a citation from those documents. Do not use general knowledge about insurance, other plans, or other years.
- Contracts do not list drugs or doctors. For whether a drug is covered, use the drug-list lookups; for hospitals, use the checked facts. Use the contract for the rules around them (exceptions, prior authorization, what you pay for a drug tier).
- A drug "not found" on a printed drug list is not proof that it isn't covered; say it wasn't found and point to the contract's exception process if it has one.
- If the documents don't answer the question, start your reply with "${NOT_STATED}" and say what to ask the insurer. Don't guess.
- Be brief: a few sentences, plain language, amounts and limits exactly as written. Address the household's situation when it's relevant.`;

export interface HistoryTurn {
  question: string;
  answer: string;
}

export interface AskInput {
  planId: string;
  question: string;
  history?: HistoryTurn[];
  profile: Profile | null;
}

export interface Reference {
  kind: 'contract' | 'facts' | 'drugs';
  quote: string;
  /** Contract page, 1-based. */
  page?: number;
  /** For contract quotes: the PDF, opened at the page. */
  url?: string;
}

export interface PlanAnswer {
  segments: { text: string; refs: number[] }[];
  references: Reference[];
  notStated: boolean;
  /** No citations came back, so the reply was replaced with a pointer to the insurer. */
  unsourced: boolean;
  source: { title: string; url: string; checked: string; insurer: string };
}

export interface PlanQaDeps {
  client: Anthropic;
  contracts: Map<string, Contract>;
  plans: Plan[];
  searchDrugs: (name: string) => Promise<{ query: string; options: DrugOption[] }>;
  drugCoverage: (rxcui: string) => Promise<Record<string, FoundCoverage>>;
}

const sourceLine = (source: string, checked: string) => `Source: ${source} (checked ${checked}).`;

/** The app's checked facts about a plan, one per line. Deterministic, since it sits before the cache marker. */
export function checkedFacts(plan: Plan): string[] {
  const facts: string[] = [];
  const { type } = networkTypeOf(plan);
  facts.push(`Plan: ${plan.name}, sold by ${plan.carrier}, ${plan.metal} level, plan ID ${plan.id}${type ? `, network type ${type}` : ''}.`);

  if (plan.benefits) {
    const b = plan.benefits;
    // Cascade plans share standard cost sharing, so their source may be another insurer's summary of it.
    const costSource = sourceLine(`the app's 2027 plan cost data, from ${b.source}`, '2026-11-06');
    const money = (n: number) => `$${n.toLocaleString('en-US')}`;
    const shares = [
      ['primary care visit', b.primary],
      ['specialist visit', b.specialist],
      ['generic drugs', b.genericRx],
      ['preferred brand drugs', b.brandRx],
      ['non-preferred brand drugs', b.nonPreferredBrandRx],
      ['specialty drugs', b.specialtyRx],
      ['lab tests', b.lab],
      ['X-rays and other tests', b.diagnostic],
      ['CT/MRI scans', b.scan],
      ['emergency room', b.er],
      ['hospital stay', b.hospital],
    ] as const;
    facts.push(
      `Costs in network: deductible ${money(b.deductible.individual)} per person, ${money(b.deductible.family)} per family; out-of-pocket maximum ${money(b.oopMax.individual)} per person, ${money(b.oopMax.family)} per family. ${costSource}`,
    );
    facts.push(
      `What you pay in network: ${shares
        .filter(([, s]) => s)
        .map(([label, s]) => `${label}: ${costShareText(s)}`)
        .join('; ')}. ${costSource}`,
    );
  }

  const rules = networkRulesFor(plan);
  if (rules) {
    const from = `the plan's 2027 Summary of Benefits and Coverage, ${rules.source}${rules.inferredFrom ? ` (taken from ${rules.inferredFrom}, on the same network)` : ''}`;
    const lines = [REFERRAL_TEXT[rules.referral] + '.', OUT_OF_NETWORK_TEXT[rules.outOfNetwork] + '.'];
    if (rules.urgentCareAway) lines.push(URGENT_AWAY_TEXT[rules.urgentCareAway.coverage] + (rules.urgentCareAway.note ? ` (${rules.urgentCareAway.note})` : '') + '.');
    if (rules.priorApproval?.length) lines.push(`Prior approval listed for: ${rules.priorApproval.map((s) => PRIOR_APPROVAL_LABELS[s]).join(', ')}.`);
    if (rules.notCovered?.length) lines.push(`Listed as not covered: ${rules.notCovered.join('; ')}.`);
    if (rules.otherCovered?.length) lines.push(`Listed as other covered services: ${rules.otherCovered.join('; ')}.`);
    facts.push(`Network rules: ${lines.join(' ')} ${sourceLine(from, NETWORK_RULES_BUILT)}`);
  }

  for (const f of FACILITIES) {
    const a = facilityAccess(plan, f.id);
    if (a.status === 'unknown') {
      facts.push(`${f.name} (${f.address}): network status not checked for this plan.`);
      continue;
    }
    const status = LIST_STATUS_LABELS[a.status];
    const source =
      a.from === 'hospital'
        ? sourceLine(`the hospital's own list of accepted plans, ${a.source}${a.year ? `, for ${a.year}` : ''}`, FACILITY_SOURCE.checked)
        : sourceLine(`${FACILITY_SOURCE.name}, ${FACILITY_SOURCE.url}`, FACILITY_SOURCE.checked);
    const disagree = a.disagrees
      ? ` Washington Healthplanfinder's facility search says ${a.directorySays === 'in' ? 'in network' : 'not in network'}, which disagrees; confirm with the hospital and insurer.`
      : '';
    facts.push(`${f.name} (${f.address}): ${status}${a.note ? ` (${a.note})` : ''}.${disagree} ${source}`);
  }
  return facts;
}

const describeCoverage = (name: string, matched: string, c: FoundCoverage | undefined): string => {
  if (!c) return `${name} (matched as ${matched}): this plan's drug list isn't loaded, so its coverage is unknown.`;
  const list = `${c.carrier}'s drug list (${c.source}, ${c.planYear} edition${c.planYear !== 2027 ? '; the 2027 list isn\'t published yet' : ''}, ${c.sourceUrl}, read ${c.builtAt.slice(0, 10)})`;
  const assumed = c.assumption ? ` Note: ${c.assumption}` : '';
  if (!c.covered) {
    return c.source === 'drug list PDF'
      ? `${name} (matched as ${matched}): not found by name on ${list}. A printed list can miss a match, so this isn't proof it's excluded.${assumed}`
      : `${name} (matched as ${matched}): not on ${list}.${assumed}`;
  }
  const tier = c.tier ? TIER_LABELS[c.tier].toLowerCase() : 'tier not stated';
  const restrictions = c.restrictions?.length ? `; ${c.restrictions.map((r) => RESTRICTION_LABELS[r]).join('; ')}` : '';
  const generic = c.asGeneric ? '; covered as its generic' : '';
  const row = c.matchedRow ? ` (listed as "${c.matchedRow}")` : '';
  return `${name} (matched as ${matched}): on ${list}${row}, tier: ${tier}${restrictions}${generic}.${assumed}`;
};

/** Medication names the question mentions, read by a small model. Empty when there are none or the call fails. */
export async function drugsInQuestion(client: Anthropic, question: string): Promise<string[]> {
  try {
    const response = await client.beta.messages.parse({
      model: EXTRACT_MODEL,
      max_tokens: 300,
      system: 'List the medication names (brand or generic) the user mentions. Only names actually written in the message; none if there are none.',
      output_config: { format: betaZodOutputFormat(z.object({ drugs: z.array(z.string()) })) },
      messages: [{ role: 'user', content: question }],
    });
    return [...new Set((response.parsed_output?.drugs ?? []).map((d) => d.trim()).filter((d) => d.length >= 2 && d.length <= 80))].slice(0, MAX_ASKED_DRUGS);
  } catch {
    return [];
  }
}

/** Drug-list lines for the household's linked medications and the drugs named in the question, for one plan. */
export async function drugFacts(deps: Pick<PlanQaDeps, 'searchDrugs' | 'drugCoverage'>, planId: string, profile: Profile | null, asked: string[]): Promise<string[]> {
  const wanted = new Map<string, { name: string; matched: string }>();
  for (const member of profile?.members ?? []) {
    for (const item of member.careItems) {
      if (item.drug && MEDICATION_CATEGORIES.includes(item.category)) wanted.set(item.drug.rxcui, { name: item.name, matched: item.drug.name });
    }
  }
  const unmatched: string[] = [];
  await Promise.all(
    asked.map(async (name) => {
      try {
        const top = (await deps.searchDrugs(name)).options[0];
        if (top) {
          if (!wanted.has(top.rxcui)) wanted.set(top.rxcui, { name, matched: top.name });
        } else unmatched.push(name);
      } catch {
        unmatched.push(name);
      }
    }),
  );
  const lines = await Promise.all(
    [...wanted].map(async ([rxcui, { name, matched }]) => {
      try {
        return describeCoverage(name, matched, (await deps.drugCoverage(rxcui))[planId]);
      } catch {
        return `${name}: the drug lists couldn't be searched just now, so its coverage is unknown.`;
      }
    }),
  );
  for (const name of unmatched) lines.push(`${name}: not found in the national drug database (RxNorm), so it couldn't be looked up on the drug list.`);
  return lines.length ? lines.sort() : ['No medications were looked up for this question.'];
}

/** The household's situation, without names: ages, care needs, medications and must-have hospitals. */
export function householdSummary(profile: Profile | null): string {
  if (!profile?.members.length) return 'No household details are saved.';
  const people = profile.members.map((m, i) => {
    const items = m.careItems.map((c) => `${c.name || CATEGORY_LABELS[c.category]} (${CATEGORY_LABELS[c.category].toLowerCase()}${c.category === 'selfPay' ? '' : `, ${c.perYear} a year`})`);
    return `Person ${i + 1}, age ${m.age}: ${items.length ? items.join('; ') : 'no care needs listed'}.`;
  });
  const hospitals = (profile.providers ?? [])
    .filter((p) => !isCandidate(p) && p.hospitalId)
    .map((p) => FACILITIES.find((f) => f.id === p.hospitalId)?.name ?? p.name);
  if (hospitals.length) people.push(`Must-have hospitals: ${hospitals.join(', ')}.`);
  return people.join('\n');
}

/** Longest citable piece of a contract. Citations cover whole pieces, so shorter pieces mean tighter quotes. */
const MAX_CHUNK = 400;

/**
 * A contract split into short citable pieces (a sentence or a few), each with the page it's on. Deterministic, so
 * the cached request start never changes for the same contract.
 */
export interface Chunks {
  texts: string[];
  pages: number[];
}

const chunkCache = new WeakMap<Contract, Chunks>();

export function contractChunks(contract: Contract): Chunks {
  const cached = chunkCache.get(contract);
  if (cached) return cached;
  const texts: string[] = [];
  const pages: number[] = [];
  contract.pages.forEach((page, i) => {
    const sentences = page
      .replace(/\s+/g, ' ')
      .trim()
      .split(/(?<=[.!?:;])\s+(?=[A-Z•(\d])|\s+(?=•)/)
      .filter(Boolean);
    if (!sentences.length) sentences.push('(blank page)');
    let current = '';
    const flush = () => {
      if (!current) return;
      texts.push(current);
      pages.push(i + 1);
      current = '';
    };
    for (const sentence of sentences) {
      // A very long run without sentence breaks (a table) is cut at word boundaries.
      for (const part of sentence.length > MAX_CHUNK ? (sentence.match(new RegExp(`.{1,${MAX_CHUNK}}(\\s|$)`, 'g')) ?? [sentence]) : [sentence]) {
        const piece = part.trim();
        if (current && current.length + piece.length + 1 > MAX_CHUNK) flush();
        current = current ? `${current} ${piece}` : piece;
      }
    }
    flush();
  });
  const chunks = { texts, pages };
  chunkCache.set(contract, chunks);
  return chunks;
}

/** The shared start of every request about a plan: instructions, contract, checked facts, with the cache marker. */
function sharedContent(contract: Contract, plan: Plan): Anthropic.ContentBlockParam[] {
  return [
    {
      type: 'document',
      title: contract.title,
      context: `Published by ${contract.insurer} at ${contract.url}. The text is in reading order, split into short pieces.`,
      source: { type: 'content', content: contractChunks(contract).texts.map((text) => ({ type: 'text' as const, text })) },
      citations: { enabled: true },
    },
    {
      type: 'document',
      title: 'Checked facts about this plan',
      context: 'Gathered and checked by this app from the sources named in each line.',
      source: { type: 'content', content: checkedFacts(plan).map((text) => ({ type: 'text' as const, text })) },
      citations: { enabled: true },
      cache_control: { type: 'ephemeral', ttl: '1h' },
    },
  ];
}

export function buildAskRequest(
  contract: Contract,
  plan: Plan,
  drugLines: string[],
  household: string,
  question: string,
  history: HistoryTurn[] = [],
): Anthropic.MessageCreateParamsNonStreaming {
  const earlier = history.length
    ? `Earlier in this conversation:\n${history.map((h) => `Q: ${h.question}\nA: ${h.answer}`).join('\n\n')}`
    : null;
  return {
    model: MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          ...sharedContent(contract, plan),
          {
            type: 'document',
            title: 'Drug-list lookups',
            context: 'Looked up by this app in the insurers\' published drug lists for this question.',
            source: { type: 'content', content: drugLines.map((text) => ({ type: 'text' as const, text })) },
            citations: { enabled: true },
          },
          { type: 'text', text: `About the household asking:\n${household}` },
          ...(earlier ? [{ type: 'text' as const, text: earlier }] : []),
          { type: 'text', text: `Question: ${question}` },
        ],
      },
    ],
  };
}

/** Writes the shared start into the cache without answering anything (billed as a cache write only). */
export function buildWarmRequest(contract: Contract, plan: Plan): Anthropic.MessageCreateParamsNonStreaming {
  return { model: MODEL, max_tokens: 0, system: SYSTEM, messages: [{ role: 'user', content: sharedContent(contract, plan) }] };
}

const KINDS: Reference['kind'][] = ['contract', 'facts', 'drugs'];

export function parseAnswer(response: Anthropic.Message, contract: Contract): PlanAnswer {
  if (response.stop_reason === 'refusal') throw new AnswerRefusedError('Claude declined to answer.');
  const { pages } = contractChunks(contract);
  const references: Reference[] = [];
  const keyOf = new Map<string, number>();
  const segments: PlanAnswer['segments'] = [];
  for (const block of response.content) {
    if (block.type !== 'text') continue;
    const refs: number[] = [];
    for (const c of block.citations ?? []) {
      if (c.type !== 'content_block_location') continue;
      const kind = KINDS[c.document_index];
      if (!kind) continue;
      const page = kind === 'contract' ? pages[c.start_block_index] : undefined;
      const key = `${kind}:${c.start_block_index}:${c.cited_text}`;
      let n = keyOf.get(key);
      if (n === undefined) {
        n = references.push({ kind, quote: c.cited_text.trim(), ...(page ? { page, url: `${contract.url}#page=${page}` } : {}) });
        keyOf.set(key, n);
      }
      if (!refs.includes(n)) refs.push(n);
    }
    segments.push({ text: block.text, refs });
  }
  // Ignore Markdown around the marker ("**Not stated:**").
  const text = segments.map((s) => s.text).join('').replace(/^[\s*_#>]+/, '');
  const notStated = /^not stated\b/i.test(text);
  const source = { title: contract.title, url: contract.url, checked: contract.checked, insurer: contract.insurer };
  if (!references.length && !notStated) {
    return {
      segments: [{ text: `No sourced answer was found in this plan's documents. Ask ${contract.insurer} directly.`, refs: [] }],
      references: [],
      notStated: false,
      unsourced: true,
      source,
    };
  }
  return { segments, references, notStated, unsourced: false, source };
}

const logUsage = (what: string, planId: string, usage: Anthropic.Usage) =>
  console.log(
    `${what} ${planId}: cache read ${usage.cache_read_input_tokens ?? 0}, cache written ${usage.cache_creation_input_tokens ?? 0}, input ${usage.input_tokens}, output ${usage.output_tokens}`,
  );

function planAndContract(deps: Pick<PlanQaDeps, 'contracts' | 'plans'>, planId: string): { plan: Plan; contract: Contract } {
  const contract = deps.contracts.get(planId);
  const plan = deps.plans.find((p) => p.id === planId);
  if (!contract || !plan) throw new NoContractError(`No contract is loaded for plan ${planId}.`);
  return { plan, contract };
}

export const hasContract = (deps: Pick<PlanQaDeps, 'contracts' | 'plans'>, planId: string): boolean =>
  deps.contracts.has(planId) && deps.plans.some((p) => p.id === planId);

export async function askPlan(deps: PlanQaDeps, input: AskInput): Promise<PlanAnswer> {
  const { plan, contract } = planAndContract(deps, input.planId);
  const asked = await drugsInQuestion(deps.client, input.question);
  const drugLines = await drugFacts(deps, plan.id, input.profile, asked);
  const request = buildAskRequest(contract, plan, drugLines, householdSummary(input.profile), input.question, input.history);
  const response = await deps.client.messages.create(request);
  logUsage('plan question', plan.id, response.usage);
  return parseAnswer(response, contract);
}

export async function warmPlan(deps: PlanQaDeps, planId: string): Promise<void> {
  const { plan, contract } = planAndContract(deps, planId);
  const response = await deps.client.messages.create(buildWarmRequest(contract, plan));
  logUsage('plan warm-up', plan.id, response.usage);
}
