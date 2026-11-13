import path from 'node:path';

export interface ServerConfig {
  production: boolean;
  port: number;
  dataDir: string;
  /** OAuth client ID from Google Cloud, used to verify sign-in tokens. */
  googleClientId: string;
  /** Lowercased emails allowed to sign in. Empty means anyone with a Google account. */
  allowedEmails: string[];
  /** 32-byte key that encrypts saved profiles. */
  profileKey: Buffer;
  /** Signs in as this email without Google. Only allowed outside production. */
  devLoginEmail: string | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const production = env.NODE_ENV === 'production';
  const problems: string[] = [];

  const profileKey = Buffer.from(env.PROFILE_KEY ?? '', 'base64');
  if (profileKey.length !== 32) problems.push('PROFILE_KEY must be 32 bytes, base64 encoded (openssl rand -base64 32).');

  const allowedEmails = (env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (production && allowedEmails.length === 0) {
    problems.push('ALLOWED_EMAILS is required in production, so strangers cannot sign in and use your Claude key.');
  }

  const devLoginEmail = env.DEV_LOGIN_EMAIL?.trim().toLowerCase() || null;
  if (production && devLoginEmail) problems.push('DEV_LOGIN_EMAIL must not be set in production.');

  const googleClientId = env.GOOGLE_CLIENT_ID?.trim() ?? '';
  if (!googleClientId && !devLoginEmail) problems.push('Set GOOGLE_CLIENT_ID (or DEV_LOGIN_EMAIL for local testing).');

  if (problems.length) throw new Error(`Server configuration problems:\n- ${problems.join('\n- ')}`);

  return {
    production,
    port: Number(env.PORT) || 3001,
    dataDir: path.resolve(env.DATA_DIR ?? 'data'),
    googleClientId,
    allowedEmails,
    profileKey,
    devLoginEmail,
  };
}
