import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { ServerConfig } from './config';
import { newToken } from './crypto';
import type { Store, User } from './db';
import { AssistantNotConfiguredError, ReplyRefusedError, type ChatResult } from './chat';
import type { ClinicCheck, DoctorRecord } from '../src/domain/doctors';
import type { DrugOption } from './drugs';
import type { FoundCoverage } from './formularyData';
import { AnswerRefusedError, NoContractError, type PlanAnswer } from './planQa';
import type { Profile } from '../src/domain/profile';
import {
  chatRequestSchema,
  drugCoverageRequestSchema,
  drugSearchSchema,
  doctorCheckSchema,
  doctorSearchSchema,
  planIdSchema,
  planQuestionSchema,
  profileSchema,
  type ChatRequest,
  type DoctorCheckRequest,
  type PlanQuestion,
} from './schema';

export const SESSION_COOKIE = 'mih_session';
const CHAT_TURNS_PER_HOUR = 150;
const DOCTOR_SEARCHES_PER_HOUR = 60;
/** Each check runs web searches with Claude, so it costs more than a chat turn. */
const DOCTOR_CHECKS_PER_HOUR = 20;
/** Each question reads a whole plan contract with Claude. */
const PLAN_QUESTIONS_PER_HOUR = 40;
const PLAN_WARMUPS_PER_HOUR = 60;

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
  /** Searches the national provider registry. */
  searchDoctors: (query: { first: string; last: string; city: string }) => Promise<DoctorRecord[]>;
  /** Looks a medication up in RxNorm. */
  searchDrugs: (name: string) => Promise<{ query: string; options: DrugOption[] }>;
  /** Coverage of one drug on every plan with a loaded drug list, by plan id. */
  drugCoverage: (rxcui: string) => Promise<Record<string, FoundCoverage>>;
  /** Checks a doctor's clinic websites and directories. */
  checkDoctor: (request: DoctorCheckRequest) => Promise<ClinicCheck>;
  /** Answers a question about one plan from its contract and the app's checked data. */
  askPlan: (planId: string, question: PlanQuestion, profile: Profile | null) => Promise<PlanAnswer>;
  /** Loads a plan's contract into Claude's prompt cache ahead of a question. */
  warmPlan: (planId: string) => Promise<void>;
  /** Plans that have a contract loaded. */
  hasContract: (planId: string) => boolean;
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

export function createApp({ config, store, verifyGoogleToken, chat, searchDoctors, checkDoctor, searchDrugs, drugCoverage, askPlan, warmPlan, hasContract, staticDir }: AppDeps) {
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

  // Admins see maintenance notices; the flag goes wherever the client receives its user.
  const withRole = (user: User) => ({ ...user, isAdmin: config.adminEmails.includes(user.email.toLowerCase()) });

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
    res.json({ user: withRole(user) });
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
    res.json({ user: withRole(req.user!) });
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

  /** Returns false (and answers 429) when the user has used up this hour's allowance. */
  const limiter = (perHour: number, message: string) => {
    const log = new Map<number, number[]>();
    return (req: AuthedRequest, res: Response) => {
      const now = Date.now();
      const recent = (log.get(req.user!.id) ?? []).filter((t) => now - t < 60 * 60 * 1000);
      if (recent.length >= perHour) {
        res.status(429).json({ error: message });
        return false;
      }
      log.set(req.user!.id, [...recent, now]);
      return true;
    };
  };

  const chatAllowed = limiter(CHAT_TURNS_PER_HOUR, 'Scout needs a breather after so many messages. Please try again later, or use the form.');
  app.post('/api/chat', requireUser, async (req: AuthedRequest, res) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'That message could not be sent. Keep each message under 4,000 characters.' });
      return;
    }
    if (!chatAllowed(req, res)) return;
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

  const searchAllowed = limiter(DOCTOR_SEARCHES_PER_HOUR, 'Too many searches this hour. Please try again later.');
  app.post('/api/doctors/search', requireUser, async (req: AuthedRequest, res) => {
    const parsed = doctorSearchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Enter at least a last name (2 letters or more).' });
      return;
    }
    if (!searchAllowed(req, res)) return;
    try {
      res.json({ doctors: await searchDoctors(parsed.data) });
    } catch (error) {
      console.error('doctor search failed:', error instanceof Error ? error.message : error);
      res.status(502).json({ error: "The national provider registry didn't answer. Try again in a moment." });
    }
  });

  const drugSearchAllowed = limiter(DOCTOR_SEARCHES_PER_HOUR, 'Too many searches this hour. Please try again later.');
  app.post('/api/drugs/search', requireUser, async (req: AuthedRequest, res) => {
    const parsed = drugSearchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Enter at least 2 letters of the medication name.' });
      return;
    }
    if (!drugSearchAllowed(req, res)) return;
    try {
      res.json(await searchDrugs(parsed.data.name));
    } catch (error) {
      console.error('drug search failed:', error instanceof Error ? error.message : error);
      res.status(502).json({ error: "The national drug database (RxNorm) didn't answer. Try again in a moment." });
    }
  });

  app.post('/api/drugs/coverage', requireUser, async (req: AuthedRequest, res) => {
    const parsed = drugCoverageRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'That drug could not be looked up.' });
      return;
    }
    if (!drugSearchAllowed(req, res)) return;
    try {
      res.json({ plans: await drugCoverage(parsed.data.rxcui) });
    } catch (error) {
      console.error('drug coverage lookup failed:', error instanceof Error ? error.message : error);
      res.status(502).json({ error: "The drug lists couldn't be searched right now. Try again in a moment." });
    }
  });

  /** The plan from the address, or a 404 when it has no contract loaded. */
  const contractPlan = (req: AuthedRequest, res: Response): string | null => {
    const id = planIdSchema.safeParse(req.params.planId);
    if (!id.success || !hasContract(id.data)) {
      res.status(404).json({ error: "This plan's contract isn't available, so questions can't be answered for it yet." });
      return null;
    }
    return id.data;
  };

  const questionAllowed = limiter(PLAN_QUESTIONS_PER_HOUR, 'Too many plan questions this hour. Please try again later.');
  app.post('/api/plans/:planId/ask', requireUser, async (req: AuthedRequest, res) => {
    const planId = contractPlan(req, res);
    if (!planId) return;
    const parsed = planQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ask a question of up to 1,000 characters.' });
      return;
    }
    if (!questionAllowed(req, res)) return;
    const saved = profileSchema.safeParse(store.getProfile(req.user!.id));
    try {
      res.json(await askPlan(planId, parsed.data, saved.success ? (saved.data as Profile) : null));
    } catch (error) {
      if (error instanceof AnswerRefusedError) {
        res.status(422).json({ error: 'Claude declined to answer that. Try rewording it.' });
        return;
      }
      if (error instanceof NoContractError) {
        res.status(404).json({ error: "This plan's contract isn't available, so questions can't be answered for it yet." });
        return;
      }
      if (error instanceof AssistantNotConfiguredError) {
        res.status(503).json({ error: "Plan questions aren't set up on this server yet (no Claude API key)." });
        return;
      }
      console.error('plan question failed:', error instanceof Error ? error.message : error);
      res.status(502).json({ error: 'The answer service is unavailable right now. Try again in a moment.' });
    }
  });

  const warmAllowed = limiter(PLAN_WARMUPS_PER_HOUR, 'Too many requests this hour.');
  app.post('/api/plans/:planId/warm', requireUser, async (req: AuthedRequest, res) => {
    const planId = contractPlan(req, res);
    if (!planId) return;
    if (!warmAllowed(req, res)) return;
    // Best effort: a failed warm-up only means the first question takes longer.
    warmPlan(planId).catch((error) => console.error('plan warm-up failed:', error instanceof Error ? error.message : error));
    res.status(204).end();
  });

  const checkAllowed = limiter(DOCTOR_CHECKS_PER_HOUR, 'Too many website checks this hour. Please try again later.');
  app.post('/api/doctors/check', requireUser, async (req: AuthedRequest, res) => {
    const parsed = doctorCheckSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'That doctor could not be checked.' });
      return;
    }
    if (!checkAllowed(req, res)) return;
    try {
      res.json({ check: await checkDoctor(parsed.data) });
    } catch (error) {
      if (error instanceof AssistantNotConfiguredError) {
        res.status(503).json({ error: "Website checks aren't set up on this server (no Claude API key)." });
        return;
      }
      console.error('doctor check failed:', error instanceof Error ? error.message : error);
      res.status(502).json({ error: "The website check didn't finish. Try again in a moment." });
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
