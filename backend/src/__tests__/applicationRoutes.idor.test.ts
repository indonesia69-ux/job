import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockApplicationFindUnique = vi.fn();
const mockApplicationDocumentFindMany = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    application: {
      findUnique: (...args: unknown[]) => mockApplicationFindUnique(...args),
    },
    applicationDocument: {
      findMany: (...args: unknown[]) => mockApplicationDocumentFindMany(...args),
    },
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
  },
}));

vi.mock('../lib/validateUploadMagicBytes', () => ({
  validateUploadMagicBytes: vi.fn().mockResolvedValue(true),
  PDF_ONLY_DETECTED_MIMES: new Set(['application/pdf']),
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

function recruiterToken(hospitalId: string | null) {
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

const otherHospitalApp = {
  id: 'app-1',
  candidateId: 'candidate-1',
  job: { hospitalId: 'other-hospital-id' },
  candidate: { name: 'Candidate' },
};

describe('application route IDOR guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({
      tokenVersion: 0,
      isSuspended: false,
      deletedAt: null,
      hospital: null,
    });
  });

  it('GET /:id/documents returns 403 when recruiter JWT has hospitalId null', async () => {
    mockApplicationFindUnique.mockResolvedValue(otherHospitalApp);

    const res = await request(createApp())
      .get('/api/applications/app-1/documents')
      .set('Authorization', `Bearer ${recruiterToken(null)}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
    expect(mockApplicationDocumentFindMany).not.toHaveBeenCalled();
  });

  it('POST /:id/offer-letter returns 403 when recruiter JWT has hospitalId null', async () => {
    mockApplicationFindUnique.mockResolvedValue(otherHospitalApp);

    const res = await request(createApp())
      .post('/api/applications/app-1/offer-letter')
      .set('Authorization', `Bearer ${recruiterToken(null)}`)
      .attach('offerLetter', Buffer.from('%PDF-1.4 test'), {
        filename: 'offer.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });
});
