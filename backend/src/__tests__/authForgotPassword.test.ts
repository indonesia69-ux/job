import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockUserFindFirst = vi.fn();
const mockSendOTP = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    user: { findFirst: (...args: unknown[]) => mockUserFindFirst(...args) },
  },
}));

vi.mock('../lib/otp', () => ({
  sendOTP: (...args: unknown[]) => mockSendOTP(...args),
  verifyOTP: vi.fn(),
  smartResendOTP: vi.fn(),
}));

vi.mock('../lib/resetTokenStore', () => ({
  generateResetToken: vi.fn(),
  validateResetToken: vi.fn(),
  deleteResetToken: vi.fn(),
}));

vi.mock('../lib/signupTokenStore', () => ({
  generateSignupToken: vi.fn(),
  validateSignupToken: vi.fn(),
  deleteSignupToken: vi.fn(),
}));

import authRoutes from '../routes/authRoutes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendOTP.mockResolvedValue({ return: true });
  });

  it('returns identical responses for existing and non-existing mobile numbers', async () => {
    const app = createApp();
    const body = { mobile: '9876543210', role: 'CANDIDATE' };

    mockUserFindFirst.mockResolvedValueOnce({
      id: 'u1',
      mobile: '9876543210',
      email: 'exists@test.com',
    });
    const existingRes = await request(app).post('/api/auth/forgot-password').send(body);

    mockUserFindFirst.mockResolvedValueOnce(null);
    const missingRes = await request(app).post('/api/auth/forgot-password').send(body);

    expect(existingRes.status).toBe(200);
    expect(missingRes.status).toBe(200);
    expect(existingRes.body).toEqual(missingRes.body);
    expect(existingRes.body).toEqual({
      message: 'If an account exists for this number, an OTP has been sent.',
    });
    expect(mockSendOTP).toHaveBeenCalledTimes(1);
  });
});
