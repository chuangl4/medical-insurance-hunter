import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { OAuth2Client } from 'google-auth-library';
import { createApp } from './app';
import { loadConfig } from './config';
import { Store } from './db';
import { AssistantNotConfiguredError, chat, ReplyRefusedError } from './chat';
import { checkDoctor, CheckRefusedError, searchDoctors } from './doctors';
import { drugNames, equivalentRxcuis, searchDrugs } from './drugs';
import { loadFormularies, lookupCoverage } from './formularyData';
import { loadContracts } from './contracts';
import { askPlan, hasContract, warmPlan, type PlanQaDeps } from './planQa';
import { KING_COUNTY_PLANS } from '../src/data/kingCounty2027';

try {
  process.loadEnvFile();
} catch {
  // No .env file; use the environment as is.
}

const config = loadConfig();
const store = new Store(path.join(config.dataDir, 'app.db'), config.profileKey);
const google = new OAuth2Client();
const anthropic = new Anthropic();

/** Reports a missing Claude key as such, rather than as a generic failure. */
async function withClaude<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    // With no key or `ant auth login` profile, the SDK fails before sending; network and HTTP failures are APIErrors.
    const noKey = !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN;
    const ours = error instanceof ReplyRefusedError || error instanceof CheckRefusedError;
    if (noKey && !(error instanceof Anthropic.APIError) && !ours) throw new AssistantNotConfiguredError();
    throw error;
  }
}

const formularies = loadFormularies();
console.log(`Drug lists loaded: ${formularies.map((f) => `${f.carrier} (${f.planIds.length} plans)`).join(', ') || 'none'}`);

const contracts = loadContracts();
console.log(`Plan contracts loaded: ${contracts.size} plans`);

const drugCoverage = async (rxcui: string) => {
  const [ids, names] = await Promise.all([equivalentRxcuis(rxcui), drugNames(rxcui)]);
  return lookupCoverage(formularies, ids, names);
};
const planQa: PlanQaDeps = { client: anthropic, contracts, plans: KING_COUNTY_PLANS, searchDrugs, drugCoverage };

const app = createApp({
  config,
  store,
  verifyGoogleToken: async (idToken) => {
    const ticket = await google.verifyIdToken({ idToken, audience: config.googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new Error('Token has no account details.');
    return { sub: payload.sub, email: payload.email, emailVerified: payload.email_verified === true, name: payload.name ?? '' };
  },
  chat: (request) => withClaude(() => chat(anthropic, request)),
  searchDoctors,
  searchDrugs,
  drugCoverage,
  askPlan: (planId, { question, history }, profile) => withClaude(() => askPlan(planQa, { planId, question, history, profile })),
  warmPlan: (planId) => withClaude(() => warmPlan(planQa, planId)),
  hasContract: (planId) => hasContract(planQa, planId),
  checkDoctor: (request) => withClaude(() => checkDoctor(anthropic, request)),
  staticDir: config.production ? path.resolve('dist') : undefined,
});

app.listen(config.port, config.host, (error) => {
  if (error) throw error;
  console.log(`API listening on http://${config.host}:${config.port}${config.production ? '' : ' (open the Vite URL in development)'}`);
  if (config.devLoginEmail) console.log(`Dev sign-in is on for ${config.devLoginEmail}. Never use this in production.`);
  if (!config.allowedEmails.length) console.log('ALLOWED_EMAILS is empty, so any Google account can sign in.');
});
