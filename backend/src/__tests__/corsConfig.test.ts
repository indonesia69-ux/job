import { describe, it, expect } from 'vitest';
import { evaluateCorsOrigin } from '../lib/corsConfig';

describe('evaluateCorsOrigin', () => {
  const origins = ['https://jobs.example.com'];

  it('rejects missing Origin when allowed origins are configured', () => {
    const result = evaluateCorsOrigin(undefined, origins, 'production');
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('Origin header required');
  });

  it('allows a matching Origin', () => {
    const result = evaluateCorsOrigin('https://jobs.example.com', origins, 'production');
    expect(result.allowed).toBe(true);
  });

  it('still allows missing Origin in development when no origins are configured', () => {
    const result = evaluateCorsOrigin(undefined, [], 'development');
    expect(result.allowed).toBe(true);
  });

  it('production with empty origins fails closed before permissive-when-empty branch', () => {
    const withOrigin = evaluateCorsOrigin('https://evil.com', [], 'production');
    const withoutOrigin = evaluateCorsOrigin(undefined, [], 'production');

    expect(withOrigin).toEqual({
      allowed: false,
      error: 'CORS is not configured for production',
    });
    expect(withoutOrigin).toEqual({
      allowed: false,
      error: 'CORS is not configured for production',
    });
  });
});
