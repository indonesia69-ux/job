import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockUserFindFirst = vi.fn();
const mockSendOTP = vi.fn();
const mockVerifyOTP = vi.fn();
const mockGenerateSignupToken = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    user: { findFirst: (...args: unknown[]) => mockUserFindFirst(...args) },
  },
}));

vi.mock('../lib/otp', () => ({
  sendOTP: (...args: unknown[]) => mockSendOTP(...args),
  verifyOTP: (...args: unknown[]) => mockVerifyOTP(...args),
  smartResendOTP: vi.fn(),
}));

vi.mock('../lib/resetTokenStore', () => ({
  generateResetToken: vi.fn(),
  validateResetToken: vi.fn(),
  deleteResetToken: vi.fn(),
}));

vi.mock('../lib/signupTokenStore', () => ({
  generateSignupToken: (...args: unknown[]) => mockGenerateSignupToken(...args),
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

describe('POST /api/auth/signup/send-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendOTP.mockResolvedValue({ return: true });
  });

  it('returns identical responses for existing and new mobile numbers', async () => {
    const app = createApp();
    const body = { mobile: '9876543210', role: 'CANDIDATE' };

    mockUserFindFirst.mockResolvedValueOnce({
      id: 'u1',
      mobile: '9876543210',
      role: 'CANDIDATE',
    });
    const existingRes = await request(app).post('/api/auth/signup/send-otp').send(body);

    mockUserFindFirst.mockResolvedValueOnce(null);
    const newRes = await request(app).post('/api/auth/signup/send-otp').send(body);

    expect(existingRes.status).toBe(200);
    expect(newRes.status).toBe(200);
    expect(existingRes.body).toEqual(newRes.body);
    expect(existingRes.body).toEqual({
      message: 'If this number is eligible for signup, an OTP has been sent.',
    });
    expect(mockSendOTP).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/auth/signup/verify-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyOTP.mockRejectedValue(Object.assign(new Error('wrong'), { statusCode: 400 }));
    mockGenerateSignupToken.mockResolvedValue('signup-token-abc');
  });

  it('returns identical responses for existing mobile and invalid OTP on new mobile', async () => {
    const app = createApp();
    const body = { mobile: '9876543210', otp: '123456', role: 'CANDIDATE' };

    mockUserFindFirst.mockResolvedValueOnce({
      id: 'u1',
      mobile: '9876543210',
      role: 'CANDIDATE',
    });
    const existingRes = await request(app).post('/api/auth/signup/verify-otp').send(body);

    mockUserFindFirst.mockResolvedValueOnce(null);
    const invalidOtpRes = await request(app).post('/api/auth/signup/verify-otp').send(body);

    expect(existingRes.status).toBe(400);
    expect(invalidOtpRes.status).toBe(400);
    expect(existingRes.body).toEqual(invalidOtpRes.body);
    expect(existingRes.body).toEqual({ error: 'Invalid or expired OTP' });
    expect(mockVerifyOTP).toHaveBeenCalledTimes(1);
    expect(mockGenerateSignupToken).not.toHaveBeenCalled();
  });
});
