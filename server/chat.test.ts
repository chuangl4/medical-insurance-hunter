import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { NO_UPDATES } from '../src/domain/onboarding';
import { EMPTY_PROFILE } from '../src/domain/profile';
import { chat } from './chat';

const request = {
  messages: [{ role: 'user' as const, content: 'I take Testolol eye drops every day.' }],
  profile: { ...EMPTY_PROFILE, members: [{ id: 'm1', label: 'Pat', age: 50, careItems: [] }] },
  knownHospitals: [],
  hints: [],
};

const item = (rxcui: string | null) => ({
  memberRef: 'm1',
  name: 'Testolol',
  category: 'brandFills' as const,
  perYear: 12,
  monthlyCost: null,
  notes: '',
  cashReason: null,
  rxcui,
});

/** A parsed reply: asking for searches, or answering with one medication. */
const reply = (searchDrugs: string[], rxcui: string | null) => ({
  stop_reason: 'end_turn',
  content: [],
  parsed_output: {
    searchDrugs,
    reply: 'Got it.',
    quickReplies: [],
    updates: { ...NO_UPDATES, addItems: [item(rxcui)], linkItems: [] },
  },
});

/** A client whose replies are scripted in order. */
function fakeClient(...responses: unknown[]) {
  const parse = vi.fn();
  for (const r of responses) parse.mockResolvedValueOnce(r);
  return { client: { beta: { messages: { parse } } } as unknown as Anthropic, parse };
}

const lastMessage = (parse: ReturnType<typeof vi.fn>, call: number) => parse.mock.calls[call][0].messages.at(-1).content as string;
const search = vi.fn(async () => ({
  query: 'Testolol',
  options: [{ rxcui: '111', name: 'testolol 0.1 MG/ML Ophthalmic Solution [Testolol]', brand: true }],
}));

describe('Scout looking medications up in the drug database', () => {
  it('searches what Scout asks for, asks again with the results, and links the drug it picks', async () => {
    const { client, parse } = fakeClient(reply(['Testolol'], null), reply([], '111'));
    const result = await chat(client, request, search);
    expect(search).toHaveBeenCalledWith('Testolol');
    expect(lastMessage(parse, 1)).toContain('<drug_search_results>');
    expect(lastMessage(parse, 1)).toContain('"rxcui":"111"');
    expect(result.updates.addItems[0].drug).toEqual({ rxcui: '111', name: 'testolol 0.1 MG/ML Ophthalmic Solution [Testolol]' });
  });

  it('takes one call when there is nothing to look up, and ignores a drug no search returned', async () => {
    const { client, parse } = fakeClient(reply([], '222'));
    const result = await chat(client, request, search);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(result.updates.addItems[0].drug).toBeNull();
  });

  it('tells Scout when the database is unreachable, and still replies', async () => {
    const { client, parse } = fakeClient(reply(['Testolol'], null), reply([], null));
    const result = await chat(client, request, async () => {
      throw new Error('offline');
    });
    expect(result.updates.addItems[0].drug).toBeNull();
    expect(lastMessage(parse, 1)).toContain("couldn't be reached");
  });

  it('stops searching after a few rounds', async () => {
    const { client, parse } = fakeClient(reply(['A drug'], null), reply(['B drug'], null), reply(['C drug'], null));
    await chat(client, request, search);
    expect(parse).toHaveBeenCalledTimes(3);
    expect(lastMessage(parse, 2)).toContain('No more searches');
  });
});
