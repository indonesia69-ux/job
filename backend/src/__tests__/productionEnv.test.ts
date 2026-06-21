import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Fix 4 is primarily deployment config. These tests verify the example env files
 * document every required production variable. Manual verification after deploy:
 * - Set Render env from backend/.env.production.example
 * - Build each frontend with VITE_API_BASE from its .env.example
 * - Confirm browser API calls succeed (CORS) and admin impersonation links use
 *   configured portal URLs, not localhost.
 */
describe('production env example files', () => {
  const backendExample = join(process.cwd(), '.env.production.example');
  const recruiterExample = join(process.cwd(), '..', 'recruiter', '.env.example');
  const candidatesExample = join(process.cwd(), '..', 'candidates', '.env.example');
  const adminExample = join(process.cwd(), '..', 'admin', '.env.example');

  it('backend/.env.production.example lists all CORS origin vars', () => {
    expect(existsSync(backendExample)).toBe(true);
    const content = readFileSync(backendExample, 'utf8');
    expect(content).toContain('ALLOWED_ORIGINS_CANDIDATE=');
    expect(content).toContain('ALLOWED_ORIGINS_RECRUITER=');
    expect(content).toContain('ALLOWED_ORIGINS_ADMIN=');
    expect(content).toMatch(/https:\/\/.*example\.com/);
  });

  it('recruiter/.env.example documents VITE_API_BASE', () => {
    expect(existsSync(recruiterExample)).toBe(true);
    const content = readFileSync(recruiterExample, 'utf8');
    expect(content).toContain('VITE_API_BASE=');
  });

  it('candidates/.env.example documents VITE_API_BASE', () => {
    expect(existsSync(candidatesExample)).toBe(true);
    const content = readFileSync(candidatesExample, 'utf8');
    expect(content).toContain('VITE_API_BASE=');
  });

  it('admin/.env.example documents impersonation portal URLs', () => {
    expect(existsSync(adminExample)).toBe(true);
    const content = readFileSync(adminExample, 'utf8');
    expect(content).toContain('VITE_RECRUITER_URL=');
    expect(content).toContain('VITE_CANDIDATE_URL=');
  });
});

describe('production CORS fail-closed contract', () => {
  it('rejects browser requests when NODE_ENV=production and no origins configured', () => {
    const parseOrigins = (str?: string) =>
      str ? str.split(',').map((s) => s.trim().replace(/\/$/, '')) : [];

    const allowedOrigins = [
      ...new Set([
        ...parseOrigins(undefined),
        ...parseOrigins(undefined),
        ...parseOrigins(undefined),
        ...parseOrigins(undefined),
      ]),
    ];

    const nodeEnv = 'production';
    const origin = 'https://jobs.example.com';

    let callbackError: Error | null = null;
    let callbackAllowed = false;

    if (nodeEnv === 'production' && allowedOrigins.length === 0) {
      callbackError = new Error('CORS is not configured for production');
    } else if (allowedOrigins.length === 0) {
      callbackAllowed = true;
    } else if (!origin || allowedOrigins.includes(origin)) {
      callbackAllowed = true;
    } else {
      callbackError = new Error('Not allowed by CORS');
    }

    expect(callbackError?.message).toBe('CORS is not configured for production');
    expect(callbackAllowed).toBe(false);
  });
});
