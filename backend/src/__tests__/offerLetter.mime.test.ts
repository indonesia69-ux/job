import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockApplicationFindUnique = vi.fn();
const mockApplicationUpdate = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    application: {
      findUnique: (...args: unknown[]) => mockApplicationFindUnique(...args),
      update: (...args: unknown[]) => mockApplicationUpdate(...args),
    },
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
  },
}));

vi.mock('../lib/cloudinary', () => ({
  uploadRawBuffer: vi.fn(),
}));

vi.mock('../lib/email', () => ({
  sendOfferLetterEmail: vi.fn(),
}));

import applicationRoutes from '../routes/applicationRoutes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/applications', applicationRoutes);
  return app;
}

function recruiterToken(hospitalId: string) {
  return jwt.sign(
    {
      id: 'recruiter-1',
      email: 'recruiter@test.com',
      name: 'Recruiter',
      role: 'RECRUITER',
      hospitalId,
      tokenVersion: 0,
    },
    process.env.JWT_SECRET!,
  );
}

const ownedApp = {
  id: 'app-1',
  candidateId: 'candidate-1',
  job: { hospitalId: 'hospital-1' },
  candidate: { name: 'Candidate' },
};

// Minimal valid JPEG (FF D8 FF)
const JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

describe('POST /api/applications/:id/offer-letter MIME validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({
      tokenVersion: 0,
      isSuspended: false,
      deletedAt: null,
      hospital: null,
    });
    mockApplicationFindUnique.mockResolvedValue(ownedApp);
  });

  it('rejects non-PDF content even when declared as application/pdf', async () => {
    const res = await request(createApp())
      .post('/api/applications/app-1/offer-letter')
      .set('Authorization', `Bearer ${recruiterToken('hospital-1')}`)
      .attach('offerLetter', JPEG_BUFFER, {
        filename: 'fake-offer.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Only PDF');
    expect(mockApplicationUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when JPEG is declared as image/jpeg (multer fileFilter)', async () => {
    const res = await request(createApp())
      .post('/api/applications/app-1/offer-letter')
      .set('Authorization', `Bearer ${recruiterToken('hospital-1')}`)
      .attach('offerLetter', JPEG_BUFFER, {
        filename: 'scan.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Only PDF');
    expect(mockApplicationUpdate).not.toHaveBeenCalled();
  });
});
