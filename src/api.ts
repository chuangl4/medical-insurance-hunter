import type { ClinicCheck, DoctorRecord } from './domain/doctors';
import type { ChatUpdates } from './domain/onboarding';
import type { Profile } from './domain/profile';

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface AuthConfig {
  googleClientId: string | null;
  devLogin: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(path, {
    method: init.method ?? 'GET',
    credentials: 'same-origin',
    headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error ?? `Request failed (${response.status}).`, response.status);
  return data as T;
}

export const api = {
  config: () => call<AuthConfig>('/api/config'),
  me: () => call<{ user: User }>('/api/me').then((r) => r.user),
  signInWithGoogle: (credential: string) =>
    call<{ user: User }>('/api/auth/google', { method: 'POST', body: { credential } }).then((r) => r.user),
  devSignIn: () => call<{ user: User }>('/api/auth/dev', { method: 'POST', body: {} }).then((r) => r.user),
  signOut: () => call('/api/auth/logout', { method: 'POST', body: {} }),
  getProfile: () => call<{ profile: Profile | null }>('/api/profile').then((r) => r.profile),
  saveProfile: (profile: Profile) => call('/api/profile', { method: 'PUT', body: { profile } }),
  chat: (body: {
    messages: { role: 'user' | 'assistant'; content: string }[];
    profile: Profile;
    hints: string[];
    knownHospitals: { id: string; name: string }[];
  }) => call<{ reply: string; quickReplies: string[]; updates: ChatUpdates }>('/api/chat', { method: 'POST', body }),
  searchDoctors: (query: { first: string; last: string; city: string }) =>
    call<{ doctors: DoctorRecord[] }>('/api/doctors/search', { method: 'POST', body: query }).then((r) => r.doctors),
  searchDrugs: (name: string) =>
    call<{ query: string; options: { rxcui: string; name: string; brand: boolean }[] }>('/api/drugs/search', { method: 'POST', body: { name } }),
  drugCoverage: (rxcui: string) =>
    call<{
      plans: Record<
        string,
        {
          covered: boolean;
          tier?: string;
          restrictions?: string[];
          carrier: string;
          source: string;
          sourceUrl: string;
          builtAt: string;
          planYear: number;
          matchedRxcui: string;
          matchedRow?: string;
          asGeneric?: boolean;
          assumption?: string;
        }
      >;
    }>(
      '/api/drugs/coverage',
      { method: 'POST', body: { rxcui } },
    ).then((r) => r.plans),
  checkDoctor: (body: { doctor: DoctorRecord; carriers: string[]; hospitals: { id: string; name: string }[] }) =>
    call<{ check: ClinicCheck }>('/api/doctors/check', { method: 'POST', body }).then((r) => r.check),
};
