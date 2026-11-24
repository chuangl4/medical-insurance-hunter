import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_PROFILE, type Profile } from '../src/domain/profile';
import type { Plan } from '../src/domain/types';
import type { Contract } from './contracts';
import type { FoundCoverage } from './formularyData';
import { askPlan, buildAskRequest, contractChunks, buildWarmRequest, drugFacts, householdSummary, NOT_STATED, parseAnswer, type PlanQaDeps } from './planQa';

// Made-up plan, contract, household and drugs only.
const plan = {
  id: '11111WA0000001',
  carrier: 'Testco',
  name: 'Testco Cascade Complete Gold',
  metal: 'gold',
  network: 'HMO',
  benefits: null,
} as unknown as Plan;

const contract: Contract = {
  slug: 'testco',
  planIds: [plan.id],
  url: 'https://example.test/contract.pdf',
  title: 'Testco Cascade Complete Gold 2027 Policy',
  insurer: 'Testco',
  planYear: 2027,
  checked: '2026-11-22',
  builtAt: '2026-11-22T00:00:00.000Z',
  sha256: 'x',
  pages: ['Cover page', '', 'Hearing aids: one per ear every 36 months.'],
};

const household = (drugName: string): Profile => ({
  ...EMPTY_PROFILE,
  members: [
    {
      id: 'm1',
      label: 'Pat Example',
      age: 40,
      careItems: [{ id: 'c1', name: drugName, category: 'brandFills', perYear: 12, monthlyCost: null, notes: '', drug: { rxcui: '111', name: `${drugName} 10 MG Oral Tablet` } }],
    },
  ],
});

const coverage = (over: Partial<FoundCoverage> = {}): FoundCoverage => ({
  covered: true,
  tier: 'nonPreferredBrand',
  restrictions: ['priorAuth'],
  carrier: 'Testco',
  source: 'drug file',
  sourceUrl: 'https://example.test/drugs.json',
  builtAt: '2026-11-16T00:00:00.000Z',
  planYear: 2027,
  matchedRxcui: '111',
  ...over,
});

type Block = Anthropic.ContentBlockParam;
const content = (req: Anthropic.MessageCreateParamsNonStreaming) => req.messages[0].content as Block[];

describe('the request sent to Claude', () => {
  it('puts the contract (one block per page) and the checked facts first, with the cache marker on the facts only', () => {
    const blocks = content(buildAskRequest(contract, plan, ['Drug line'], 'Household', 'Are hearing aids covered?'));
    expect(blocks.map((b) => b.type)).toEqual(['document', 'document', 'document', 'text', 'text']);
    const [doc, facts, drugs] = blocks as Anthropic.DocumentBlockParam[];
    expect((doc.source as Anthropic.ContentBlockSource).content).toHaveLength(3);
    expect(((doc.source as Anthropic.ContentBlockSource).content as Anthropic.TextBlockParam[])[1].text).toBe('(blank page)');
    expect(blocks.filter((b) => 'cache_control' in b && b.cache_control)).toEqual([facts]);
    expect(facts.cache_control).toEqual({ type: 'ephemeral', ttl: '1h' });
    expect([doc, facts, drugs].every((d) => d.citations?.enabled)).toBe(true);
  });

  it('keeps everything before the cache marker identical for different households and questions', () => {
    const a = buildAskRequest(contract, plan, ['Testolol: covered'], householdSummary(household('Testolol')), 'Is Testolol covered?');
    const b = buildAskRequest(contract, plan, ['No medications'], 'No household details are saved.', 'What is the deductible?', [{ question: 'Hi', answer: 'Hello' }]);
    expect(a.system).toBe(b.system);
    expect(a.model).toBe(b.model);
    expect(content(a).slice(0, 2)).toEqual(content(b).slice(0, 2));
    expect(JSON.stringify(content(a).slice(0, 2))).not.toContain('Testolol');
  });

  it('warms the cache with the same shared start and no answer', () => {
    const warm = buildWarmRequest(contract, plan);
    const ask = buildAskRequest(contract, plan, ['x'], 'y', 'z');
    expect(warm.max_tokens).toBe(0);
    expect(warm.system).toBe(ask.system);
    expect(content(warm)).toEqual(content(ask).slice(0, 2));
  });

  it('describes the household without names', () => {
    const summary = householdSummary(household('Testolol'));
    expect(summary).toContain('Person 1, age 40: Testolol');
    expect(summary).not.toContain('Pat');
  });
});

describe('splitting a contract into citable pieces', () => {
  it('keeps pieces short, in order, and remembers their pages', () => {
    const long = { ...contract, pages: ['Short page.', `${'First rule applies here. '.repeat(30)}Last rule.`, ''] };
    const { texts, pages } = contractChunks(long);
    expect(texts[0]).toBe('Short page.');
    expect(texts.every((t) => t.length <= 400)).toBe(true);
    expect(texts.slice(1, -1).join(' ')).toBe(long.pages[1].trim());
    expect(pages[0]).toBe(1);
    expect(new Set(pages.slice(1, -1))).toEqual(new Set([2]));
    expect(texts.at(-1)).toBe('(blank page)');
    expect(pages.at(-1)).toBe(3);
  });
});

describe('drug-list lookups', () => {
  const deps = (found: Record<string, FoundCoverage>) => ({
    searchDrugs: vi.fn(async (name: string) => ({ query: name, options: name === 'Nothingol' ? [] : [{ rxcui: '222', name: `${name} 5 MG`, brand: true }] })),
    drugCoverage: vi.fn(async () => found),
  });

  it("looks up the household's linked drugs and the ones asked about, for this plan", async () => {
    const d = deps({ [plan.id]: coverage() });
    const lines = await drugFacts(d, plan.id, household('Testolol'), ['Examplex', 'Nothingol']);
    expect(d.drugCoverage).toHaveBeenCalledWith('111');
    expect(d.drugCoverage).toHaveBeenCalledWith('222');
    expect(lines.find((l) => l.startsWith('Testolol'))).toContain('tier: non-preferred brand; needs prior authorization');
    expect(lines.find((l) => l.startsWith('Nothingol'))).toContain('not found in the national drug database');
  });

  it('says "not found" for a printed list, and names an older list year', async () => {
    const d = deps({ [plan.id]: coverage({ covered: false, source: 'drug list PDF', planYear: 2026, tier: undefined, restrictions: undefined }) });
    const [line] = await drugFacts(d, plan.id, null, ['Examplex']);
    expect(line).toContain('not found by name on');
    expect(line).toContain("2026 edition; the 2027 list isn't published yet");
    expect(line).toContain("isn't proof it's excluded");
  });

  it('says so when there is nothing to look up', async () => {
    expect(await drugFacts(deps({}), plan.id, null, [])).toEqual(['No medications were looked up for this question.']);
  });
});

const message = (blocks: Anthropic.ContentBlock[], stop: Anthropic.StopReason = 'end_turn') =>
  ({ content: blocks, stop_reason: stop, usage: { input_tokens: 1, output_tokens: 1 } }) as unknown as Anthropic.Message;
const cite = (document_index: number, start: number, cited_text: string) =>
  ({ type: 'content_block_location', document_index, document_title: null, start_block_index: start, end_block_index: start + 1, cited_text }) as Anthropic.TextCitation;
const text = (t: string, citations: Anthropic.TextCitation[] | null = null) => ({ type: 'text', text: t, citations }) as Anthropic.TextBlock;

describe('reading the answer', () => {
  it('turns citations into numbered references with contract page links', () => {
    const answer = parseAnswer(
      message([text('Yes: '), text('one hearing aid per ear every 36 months', [cite(0, 2, 'Hearing aids: one per ear every 36 months.')]), text(', at '), text('EvergreenHealth', [cite(1, 4, 'EvergreenHealth: In network.')])]),
      contract,
    );
    expect(answer.references).toEqual([
      { kind: 'contract', quote: 'Hearing aids: one per ear every 36 months.', page: 3, url: 'https://example.test/contract.pdf#page=3' },
      { kind: 'facts', quote: 'EvergreenHealth: In network.' },
    ]);
    expect(answer.segments.map((s) => s.refs)).toEqual([[], [1], [], [2]]);
    expect(answer.unsourced).toBe(false);
  });

  it('keeps a "not stated" answer, and replaces any other answer that has no citations', () => {
    const notStated = parseAnswer(message([text(`${NOT_STATED} the contract doesn't mention acupuncture. Ask Testco.`)]), contract);
    expect(notStated.notStated).toBe(true);
    expect(notStated.unsourced).toBe(false);
    expect(parseAnswer(message([text(`**${NOT_STATED}** nothing about acupuncture.`)]), contract).notStated).toBe(true);
    const unsourced = parseAnswer(message([text('Acupuncture is covered.')]), contract);
    expect(unsourced.unsourced).toBe(true);
    expect(unsourced.segments[0].text).toContain('Ask Testco directly');
  });

  it('reports a refusal', () => {
    expect(() => parseAnswer(message([], 'refusal'), contract)).toThrow(/declined/);
  });
});

describe('answering end to end', () => {
  it('looks drugs up, asks once, and refuses plans without a contract', async () => {
    const create = vi.fn(async () => message([text('One per ear', [cite(0, 2, 'Hearing aids: one per ear every 36 months.')])]));
    const parse = vi.fn(async () => ({ parsed_output: { drugs: ['Examplex'] } }));
    const deps: PlanQaDeps = {
      client: { messages: { create }, beta: { messages: { parse } } } as unknown as Anthropic,
      contracts: new Map([[plan.id, contract]]),
      plans: [plan],
      searchDrugs: async (name) => ({ query: name, options: [{ rxcui: '222', name: 'Examplex 5 MG', brand: true }] }),
      drugCoverage: async () => ({ [plan.id]: coverage() }),
    };
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const answer = await askPlan(deps, { planId: plan.id, question: 'Is Examplex covered?', profile: null });
    expect(answer.references[0].page).toBe(3);
    const sent = (create.mock.calls[0] as unknown as [Anthropic.MessageCreateParamsNonStreaming])[0];
    const drugDoc = content(sent)[2] as Anthropic.DocumentBlockParam;
    expect(JSON.stringify(drugDoc.source)).toContain('Examplex (matched as Examplex 5 MG): on Testco');
    await expect(askPlan(deps, { planId: '99999WA9999999', question: 'x', profile: null })).rejects.toThrow(/No contract/);
  });
});
