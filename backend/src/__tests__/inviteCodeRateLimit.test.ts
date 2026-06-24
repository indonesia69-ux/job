import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';

const mockHospitalFindUnique = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    hospital: { findUnique: (...args: unknown[]) => mockHospitalFindUnique(...args) },
  },
}));

import onboardingRoutes from '../routes/onboardingRoutes';

function createApp() {
  const app = express();
  const inviteCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/onboarding/verify-code', inviteCodeLimiter);
  app.use('/api/onboarding', onboardingRoutes);
  return app;
}

describe('invite-code rate limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHospitalFindUnique.mockResolvedValue(null);
  });

  it('returns 429 after exceeding the threshold', async () => {
    const app = createApp();
    const code = 'ABCDEF123456';

    await request(app).get(`/api/onboarding/verify-code/${code}`);
    await request(app).get(`/api/onboarding/verify-code/${code}`);
    const third = await request(app).get(`/api/onboarding/verify-code/${code}`);

    expect(third.status).toBe(429);
  });
});
