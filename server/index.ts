import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { OAuth2Client } from 'google-auth-library';
import { createApp } from './app';
import { loadConfig } from './config';
import { Store } from './db';
import { AssistantNotConfiguredError, chat, ReplyRefusedError } from './chat';

try {
  process.loadEnvFile();
} catch {
  // No .env file; use the environment as is.
}

const config = loadConfig();
const store = new Store(path.join(config.dataDir, 'app.db'), config.profileKey);
const google = new OAuth2Client();
const anthropic = new Anthropic();

const app = createApp({
  config,
  store,
  verifyGoogleToken: async (idToken) => {
    const ticket = await google.verifyIdToken({ idToken, audience: config.googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new Error('Token has no account details.');
    return { sub: payload.sub, email: payload.email, emailVerified: payload.email_verified === true, name: payload.name ?? '' };
  },
  chat: async (request) => {
    try {
      return await chat(anthropic, request);
    } catch (error) {
      // With no key or `ant auth login` profile, the SDK fails before sending; network and HTTP failures are APIErrors.
      const noKey = !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN;
      if (noKey && !(error instanceof Anthropic.APIError) && !(error instanceof ReplyRefusedError)) {
        throw new AssistantNotConfiguredError();
      }
      throw error;
    }
  },
  staticDir: config.production ? path.resolve('dist') : undefined,
});

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}${config.production ? '' : ' (open the Vite URL in development)'}`);
  if (config.devLoginEmail) console.log(`Dev sign-in is on for ${config.devLoginEmail}. Never use this in production.`);
  if (!config.allowedEmails.length) console.log('ALLOWED_EMAILS is empty, so any Google account can sign in.');
});
