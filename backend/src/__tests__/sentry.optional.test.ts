import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

describe('Sentry optional initialization', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.SENTRY_DSN;
  });

  it('does not enable Sentry when SENTRY_DSN is unset and captureException is safe', async () => {
    const { initSentry, captureException, isSentryEnabled } = await import('../lib/sentry');

    expect(() => initSentry()).not.toThrow();
    expect(isSentryEnabled()).toBe(false);
    expect(() => captureException(new Error('test error'))).not.toThrow();
  });
});
