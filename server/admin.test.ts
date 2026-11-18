import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

const base = { PROFILE_KEY: Buffer.alloc(32).toString('base64'), DEV_LOGIN_EMAIL: 'tester@localhost' };

describe('admin emails', () => {
  it('reads a lowercased admin list', () => {
    expect(loadConfig({ ...base, ADMIN_EMAILS: ' Admin@Example.com, b@example.com ' }).adminEmails).toEqual(['admin@example.com', 'b@example.com']);
  });
  it('defaults to no admins', () => {
    expect(loadConfig(base).adminEmails).toEqual([]);
  });
});
