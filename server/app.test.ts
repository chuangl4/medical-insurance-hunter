import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_PROFILE, type Profile } from '../src/domain/profile';
import { createApp, type GoogleIdentity } from './app';
import { loadConfig, type ServerConfig } from './config';
import { Store } from './db';
import { buildMessages, cleanOutput } from './chat';
import { NO_UPDATES } from '../src/domain/onboarding';

const KEY = Buffer.alloc(32, 7).toString('base64');
const identities: Record<string, GoogleIdentity> = {
  good: { sub: 'g-1', email: 'Owner@Example.com', emailVerified: true, name: 'Owner' },
  stranger: { sub: 'g-2', email: 'someone@else.com', emailVerified: true, name: 'Stranger' },
  unverified: { sub: 'g-3', email: 'owner@example.com', emailVerified: false, name: 'Owner' },
};

const profile: Profile = {
  ...EMPTY_PROFILE,
  overSubsidyLimit: true,
  members: [
    {
      id: 'm1',
      label: 'Pat',
      age: 50,
      careItems: [{ id: 'c1', name: 'Secret test drug', category: 'selfPay', perYear: 12, monthlyCost: 300, notes: '' }],
    },
  ],
};

let server: Server;
let base: string;
let store: Store;
const chat = vi.fn();
const searchDoctors = vi.fn();
const checkDoctor = vi.fn();
const searchDrugs = vi.fn();
const drugCoverage = vi.fn();

function start(overrides: Partial<ServerConfig> = {}) {
  const config: ServerConfig = {
    ...loadConfig({ PROFILE_KEY: KEY, GOOGLE_CLIENT_ID: 'client-id', ALLOWED_EMAILS: 'owner@example.com' }),
    ...overrides,
  };
  store = new Store(':memory:', config.profileKey);
  const app = createApp({
    config,
    store,
    verifyGoogleToken: async (token) => {
      if (!identities[token]) throw new Error('bad token');
      return identities[token];
    },
    chat,
    searchDoctors,
    checkDoctor,
    searchDrugs,
    drugCoverage,
  });
  return new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
}

const post = (path: string, body: unknown, cookie = '') =>
  fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(body) });

async function signIn(token = 'good'): Promise<string> {
  const response = await post('/api/auth/google', { credential: token });
  expect(response.status).toBe(200);
  return response.headers.get('set-cookie')!.split(';')[0];
}

beforeEach(() => start());
afterEach(() => {
  server.close();
  store.close();
  chat.mockReset();
  searchDoctors.mockReset();
  checkDoctor.mockReset();
  searchDrugs.mockReset();
  drugCoverage.mockReset();
});

describe('server configuration', () => {
  it('requires an encryption key and, in production, an allowlist and no dev sign-in', () => {
    expect(() => loadConfig({ GOOGLE_CLIENT_ID: 'x' })).toThrow(/PROFILE_KEY/);
    expect(() => loadConfig({ NODE_ENV: 'production', PROFILE_KEY: KEY, GOOGLE_CLIENT_ID: 'x' })).toThrow(/ALLOWED_EMAILS/);
    expect(() =>
      loadConfig({ NODE_ENV: 'production', PROFILE_KEY: KEY, GOOGLE_CLIENT_ID: 'x', ALLOWED_EMAILS: 'a@b.c', DEV_LOGIN_EMAIL: 'a@b.c' }),
    ).toThrow(/DEV_LOGIN_EMAIL/);
  });
});

describe('sign-in', () => {
  it('signs in an allowed, verified Google account with a secure session cookie', async () => {
    const response = await post('/api/auth/google', { credential: 'good' });
    expect(await response.json()).toMatchObject({ user: { email: 'owner@example.com' } });
    expect(response.headers.get('set-cookie')).toMatch(/mih_session=.+HttpOnly.*SameSite=Lax/i);
  });
  it('rejects bad tokens, unverified emails, and accounts not on the allowlist', async () => {
    expect((await post('/api/auth/google', { credential: 'forged' })).status).toBe(401);
    expect((await post('/api/auth/google', { credential: 'unverified' })).status).toBe(403);
    expect((await post('/api/auth/google', { credential: 'stranger' })).status).toBe(403);
  });
  it('has no dev sign-in unless configured', async () => {
    expect((await post('/api/auth/dev', {})).status).toBe(404);
  });
  it('ends the session on sign-out', async () => {
    const cookie = await signIn();
    expect((await fetch(`${base}/api/me`, { headers: { cookie } })).status).toBe(200);
    await post('/api/auth/logout', {}, cookie);
    expect((await fetch(`${base}/api/me`, { headers: { cookie } })).status).toBe(401);
  });
});

describe('profiles', () => {
  it('needs a signed-in user', async () => {
    expect((await fetch(`${base}/api/profile`)).status).toBe(401);
  });
  it('saves and reloads a profile from a new session, encrypted at rest', async () => {
    const first = await signIn();
    expect(await (await fetch(`${base}/api/profile`, { headers: { cookie: first } })).json()).toEqual({ profile: null });
    const saved = await fetch(`${base}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', cookie: first },
      body: JSON.stringify({ profile }),
    });
    expect(saved.status).toBe(200);

    const second = await signIn();
    expect(await (await fetch(`${base}/api/profile`, { headers: { cookie: second } })).json()).toEqual({ profile });
    expect(store.rawProfile(1)).not.toContain('Secret test drug');
  });
  it('rejects invalid profiles and non-JSON writes', async () => {
    const cookie = await signIn();
    const bad = await fetch(`${base}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ profile: { ...profile, members: [{ ...profile.members[0], age: 500 }] } }),
    });
    expect(bad.status).toBe(400);
    const form = await fetch(`${base}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie },
      body: 'profile=x',
    });
    expect(form.status).toBe(415);
  });
});

describe('setup chat', () => {
  const messages = [
    { role: 'assistant', content: 'Who needs coverage?' },
    { role: 'user', content: 'Just me, 41' },
  ];
  it('passes the conversation and profile to the assistant and returns its reply', async () => {
    const cookie = await signIn();
    const result = { reply: 'Got it!', quickReplies: ['Yes'], updates: NO_UPDATES };
    chat.mockResolvedValue(result);
    const response = await post('/api/chat', { messages, profile }, cookie);
    expect(await response.json()).toEqual(result);
    expect(chat).toHaveBeenCalledWith({ messages, profile, hints: [], knownHospitals: [] });
  });
  it('needs sign-in, a valid profile, and a user message last', async () => {
    expect((await post('/api/chat', { messages, profile })).status).toBe(401);
    const cookie = await signIn();
    expect((await post('/api/chat', { messages: messages.slice(0, 1), profile }, cookie)).status).toBe(400);
    expect((await post('/api/chat', { messages, profile: { ...profile, version: 2 } }, cookie)).status).toBe(400);
    expect(chat).not.toHaveBeenCalled();
  });
  it('reports assistant failures without exposing details', async () => {
    const cookie = await signIn();
    chat.mockRejectedValue(new Error('upstream secret'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await post('/api/chat', { messages, profile }, cookie);
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain('upstream secret');
  });
});

describe('doctor lookups', () => {
  const doctor = { npi: '1234567890', name: 'Test Doctor', credential: 'MD', specialty: 'Testing', locations: ['1 Main St · Testville, WA'] };
  it('searches the registry for signed-in users with a last name', async () => {
    expect((await post('/api/doctors/search', { last: 'Doctor' })).status).toBe(401);
    const cookie = await signIn();
    expect((await post('/api/doctors/search', { last: 'D' }, cookie)).status).toBe(400);
    searchDoctors.mockResolvedValue([doctor]);
    const response = await post('/api/doctors/search', { first: 'Test', last: 'Doctor' }, cookie);
    expect(await response.json()).toEqual({ doctors: [doctor] });
    expect(searchDoctors).toHaveBeenCalledWith({ first: 'Test', last: 'Doctor', city: '' });
  });
  it('checks websites for a valid doctor and hides failure details', async () => {
    const cookie = await signIn();
    expect((await post('/api/doctors/check', { doctor: { ...doctor, npi: 'x' }, carriers: ['A'] }, cookie)).status).toBe(400);
    const check = { checkedAt: 'now', summary: 'ok', clinicName: '', clinicUrl: null, hospitalId: null, carriers: [], premeraListed: null };
    checkDoctor.mockResolvedValue(check);
    expect(await (await post('/api/doctors/check', { doctor, carriers: ['A'] }, cookie)).json()).toEqual({ check });
    checkDoctor.mockRejectedValue(new Error('upstream secret'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failed = await post('/api/doctors/check', { doctor, carriers: ['A'] }, cookie);
    expect(failed.status).toBe(502);
    expect(JSON.stringify(await failed.json())).not.toContain('upstream secret');
  });
});

describe('drug lookups', () => {
  it('searches RxNorm for signed-in users and hides failure details', async () => {
    expect((await post('/api/drugs/search', { name: 'test' })).status).toBe(401);
    const cookie = await signIn();
    expect((await post('/api/drugs/search', { name: 'x' }, cookie)).status).toBe(400);
    searchDrugs.mockResolvedValue({ query: 'testdrug', options: [] });
    expect(await (await post('/api/drugs/search', { name: 'testdrug' }, cookie)).json()).toEqual({ query: 'testdrug', options: [] });
    searchDrugs.mockRejectedValue(new Error('upstream secret'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failed = await post('/api/drugs/search', { name: 'testdrug' }, cookie);
    expect(failed.status).toBe(502);
    expect(JSON.stringify(await failed.json())).not.toContain('upstream secret');
  });
});

describe('drug coverage lookups', () => {
  it('returns coverage by plan for a valid RxNorm id', async () => {
    const cookie = await signIn();
    expect((await post('/api/drugs/coverage', { rxcui: 'abc' }, cookie)).status).toBe(400);
    drugCoverage.mockResolvedValue({ P1: { covered: false } });
    expect(await (await post('/api/drugs/coverage', { rxcui: '123' }, cookie)).json()).toEqual({ plans: { P1: { covered: false } } });
    expect(drugCoverage).toHaveBeenCalledWith('123');
  });
});

describe('chat prompt', () => {
  it('starts with the user, merges repeated roles, and puts the profile and what is missing in the last message', () => {
    const turns = buildMessages({
      messages: [
        { role: 'assistant', content: 'Hi! Who needs coverage?' },
        { role: 'user', content: 'Me' },
        { role: 'user', content: 'I am 41' },
      ],
      profile: { ...profile, inKingCounty: true, answered: ['roster'] },
      hints: [],
      knownHospitals: [{ id: 'h1', name: 'Hospital One' }],
    });
    expect(turns.map((t) => t.role)).toEqual(['user', 'assistant', 'user']);
    const last = turns[2].content as string;
    expect(last).toContain('<message>\nMe\n\nI am 41\n</message>');
    expect(last).toContain('[c1] Secret test drug');
    expect(last).toContain('h1: Hospital One');
    expect(last).toMatch(/<still_needed>[\s\S]*Pat[\s\S]*<\/still_needed>/);
    expect(last).not.toMatch(/still_needed>[\s\S]*King County[\s\S]*<\/still_needed/);
  });
});

describe('cleaning assistant output', () => {
  it('drops unknown people, items, and hospitals, and keeps numbers in range', () => {
    const cleaned = cleanOutput(
      {
        reply: ' Woof! ',
        quickReplies: [' Yes ', '', 'No', 'Maybe', 'Later', 'Extra'],
        updates: {
          newMembers: [
            { ref: 'new-1', label: ' Kid ', age: 13.4 },
            { ref: 'new-1', label: 'Duplicate', age: 5 },
          ],
          memberChanges: [
            { memberRef: 'm1', label: null, age: 51 },
            { memberRef: 'ghost', label: 'X', age: 1 },
          ],
          addItems: [
            { memberRef: 'm1', name: 'Inhaler', category: 'brandFills', perYear: 900, monthlyCost: 50, notes: '', cashReason: 'preferCash' },
            { memberRef: 'new-1', name: 'Cream', category: 'selfPay', perYear: 1, monthlyCost: -5, notes: 'Estimated', cashReason: 'usuallyNotCovered' },
            { memberRef: 'nobody', name: 'Lost', category: 'labTests', perYear: 1, monthlyCost: null, notes: '', cashReason: null },
          ],
          removeItemIds: ['c1', 'not-an-item'],
          careComplete: ['m1', 'ghost'],
          rosterComplete: true,
          household: { ...NO_UPDATES.household, annualIncome: -10, taxHouseholdSize: 99 },
          providers: [
            { name: 'Hospital One', hospitalId: 'h1' },
            { name: 'Dr. Who', hospitalId: 'made-up' },
          ],
          noMustHaveProviders: false,
        },
      },
      { profile, knownHospitals: [{ id: 'h1', name: 'Hospital One' }] },
    );
    expect(cleaned.reply).toBe('Woof!');
    expect(cleaned.quickReplies).toEqual(['Yes', 'No', 'Maybe', 'Later']);
    const u = cleaned.updates;
    expect(u.newMembers).toEqual([{ ref: 'new-1', label: 'Kid', age: 13 }]);
    expect(u.memberChanges).toEqual([{ memberRef: 'm1', label: null, age: 51 }]);
    expect(u.addItems).toEqual([
      { memberRef: 'm1', name: 'Inhaler', category: 'brandFills', perYear: 366, monthlyCost: null, notes: '', cashReason: null },
      { memberRef: 'new-1', name: 'Cream', category: 'selfPay', perYear: 12, monthlyCost: 0, notes: 'Estimated', cashReason: 'usuallyNotCovered' },
    ]);
    expect(u.removeItemIds).toEqual(['c1']);
    expect(u.careComplete).toEqual(['m1']);
    expect(u.household).toMatchObject({ annualIncome: 0, taxHouseholdSize: 20 });
    expect(u.providers).toEqual([
      { name: 'Hospital One', hospitalId: 'h1' },
      { name: 'Dr. Who', hospitalId: null },
    ]);
  });
});
