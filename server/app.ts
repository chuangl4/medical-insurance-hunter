import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { ServerConfig } from './config';
import { newToken } from './crypto';
import type { Store, User } from './db';
import { AssistantNotConfiguredError, ReplyRefusedError, type ChatResult } from './chat';
import { chatRequestSchema, profileSchema, type ChatRequest } from './schema';

export const SESSION_COOKIE = 'mih_session';
const CHAT_TURNS_PER_HOUR = 150;

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

export interface AppDeps {
  config: ServerConfig;
  store: Store;
  /** Checks a Google sign-in token and returns who it belongs to. */
  verifyGoogleToken: (idToken: string) => Promise<GoogleIdentity>;
  /** Answers one onboarding chat message. */
  chat: (request: ChatRequest) => Promise<ChatResult>;
  /** Built front end to serve in production. */
  staticDir?: string;
}

type AuthedRequest = Request & { user?: User; sessionToken?: string };

function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function createApp({ config, store, verifyGoogleToken, chat, staticDir }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });
  app.use('/api', express.json({ limit: '400kb' }));

  // Cookies are SameSite=Lax; also require JSON on writes so plain cross-site forms can't post.
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET' && !req.is('application/json')) {
      res.status(415).json({ error: 'Send JSON.' });
      return;
    }
    next();
  });

  const setSession = (res: Response, user: User) => {
    const token = newToken();
    const expiresAt = store.createSession(user.id, token);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.production,
      path: '/',
      expires: new Date(expiresAt),
    });
  };

  const signIn = (res: Response, identity: GoogleIdentity) => {
    const email = identity.email.toLowerCase();
    if (!identity.emailVerified) {
      res.status(403).json({ error: 'Your Google email address is not verified.' });
      return;
    }
    if (config.allowedEmails.length && !config.allowedEmails.includes(email)) {
      res.status(403).json({ error: 'This account is not allowed to sign in here.' });
      return;
    }
    const user = store.upsertUser(identity.sub, email, identity.name);
    setSession(res, user);
    res.json({ user });
  };

  const requireUser = (req: AuthedRequest, res: Response, next: NextFunction) => {
    const token = readCookie(req, SESSION_COOKIE);
    const user = token ? store.userForSession(token) : null;
    if (!user) {
      res.status(401).json({ error: 'Please sign in.' });
      return;
    }
    req.user = user;
    req.sessionToken = token!;
    next();
  };

  app.get('/api/config', (_req, res) => {
    res.json({ googleClientId: config.googleClientId || null, devLogin: Boolean(config.devLoginEmail) });
  });

  app.post('/api/auth/google', async (req, res) => {
    const credential = typeof req.body?.credential === 'string' ? req.body.credential : '';
    if (!credential || !config.googleClientId) {
      res.status(400).json({ error: 'Missing Google sign-in token.' });
      return;
    }
    let identity: GoogleIdentity;
    try {
      identity = await verifyGoogleToken(credential);
    } catch {
      res.status(401).json({ error: 'Google sign-in could not be verified. Please try again.' });
      return;
    }
    signIn(res, identity);
  });

  if (config.devLoginEmail) {
    const email = config.devLoginEmail;
    app.post('/api/auth/dev', (_req, res) => signIn(res, { sub: `dev:${email}`, email, emailVerified: true, name: 'Local tester' }));
  }

  app.post('/api/auth/logout', (req, res) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) store.deleteSession(token);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  app.get('/api/me', requireUser, (req: AuthedRequest, res) => {
    res.json({ user: req.user });
  });

  app.get('/api/profile', requireUser, (req: AuthedRequest, res) => {
    res.json({ profile: store.getProfile(req.user!.id) });
  });

  app.put('/api/profile', requireUser, (req: AuthedRequest, res) => {
    const parsed = profileSchema.safeParse(req.body?.profile);
    if (!parsed.success) {
      res.status(400).json({ error: 'That profile has invalid values.', details: parsed.error.issues.slice(0, 5) });
      return;
    }
    store.saveProfile(req.user!.id, parsed.data);
    res.json({ ok: true });
  });

  const chatLog = new Map<number, number[]>();
  app.post('/api/chat', requireUser, async (req: AuthedRequest, res) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'That message could not be sent. Keep each message under 4,000 characters.' });
      return;
    }
    const now = Date.now();
    const recent = (chatLog.get(req.user!.id) ?? []).filter((t) => now - t < 60 * 60 * 1000);
    if (recent.length >= CHAT_TURNS_PER_HOUR) {
      res.status(429).json({ error: 'Scout needs a breather after so many messages. Please try again later, or use the form.' });
      return;
    }
    chatLog.set(req.user!.id, [...recent, now]);
    try {
      res.json(await chat(parsed.data));
    } catch (error) {
      if (error instanceof ReplyRefusedError) {
        res.status(422).json({ error: 'Claude declined to answer that. Try rewording it, or use the form.' });
        return;
      }
      if (error instanceof AssistantNotConfiguredError) {
        res.status(503).json({ error: "The chat isn't set up on this server yet (no Claude API key). You can use the form instead." });
        return;
      }
      console.error('chat failed:', error instanceof Error ? error.message : error);
      res.status(502).json({ error: 'Scout is unavailable right now. Try again in a moment, or use the form.' });
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  if (staticDir && existsSync(staticDir)) {
    app.use(express.static(staticDir, { index: false }));
    app.get(/.*/, (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  return app;
}
