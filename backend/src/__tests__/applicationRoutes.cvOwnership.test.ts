import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { validateCandidateOwnsCv } from '../lib/validateCandidateCvOwnership';

const mockApplicationFindUnique = vi.fn();
const mockApplicationCreate = vi.fn();
const mockJobFindUnique = vi.fn();
const mockUserFindUnique = vi.fn();
const mockCandidateUpdate = vi.fn();
const mockCandidateFindUnique = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    application: {
      findUnique: (...args: unknown[]) => mockApplicationFindUnique(...args),
      create: (...args: unknown[]) => mockApplicationCreate(...args),
    },
    job: { findUnique: (...args: unknown[]) => mockJobFindUnique(...args) },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn(),
    },
    candidate: {
      findUnique: (...args: unknown[]) => mockCandidateFindUnique(...args),
      update: (...args: unknown[]) => mockCandidateUpdate(...args),
    },
  },
}));

vi.mock('../lib/validateUploadMagicBytes', () => ({
  validateUploadMagicBytes: vi.fn().mockResolvedValue(true),
  PDF_ONLY_DETECTED_MIMES: new Set(['application/pdf']),
}));

vi.mock('../lib/cloudinary', () => ({ uploadRawBuffer: vi.fn() }));
vi.mock('../lib/email', () => ({ sendOfferLetterEmail: vi.fn() }));

import applicationRoutes from '../routes/applicationRoutes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/applications', applicationRoutes);
  return app;
}

function candidateToken(candidateId = 'cand-aaa') {
  return jwt.sign(
    {
      id: 'user-cand',
      email: 'c@test.com',
      name: 'Candidate',
      role: 'CANDIDATE',
      candidateId,
      tokenVersion: 0,
    },
    process.env.JWT_SECRET!,
  );
}

function recruiterToken(hospitalId = 'hosp-1') {
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

const openJob = {
  id: 'job-1',
  status: 'Active',
  customApplicationFields: null,
  hospital: { id: 'hosp-1', isSuspended: false },
};

describe('validateCandidateOwnsCv', () => {
  it('accepts legitimate upload shape for the owning candidate', () => {
    const candidateId = 'cand-aaa';
    const publicId = `candidates/cv/${candidateId}_1710000000000`;
    const url = `https://res.cloudinary.com/demo/raw/upload/v1/${publicId}.pdf`;

    expect(validateCandidateOwnsCv(candidateId, url, publicId)).toEqual({ ok: true });
  });

  it('rejects another candidate Cloudinary asset', () => {
    const otherUrl = 'https://res.cloudinary.com/demo/raw/upload/v1/candidates/cv/cand-bbb_1710000000000.pdf';
    const otherId = 'candidates/cv/cand-bbb_1710000000000';

    const result = validateCandidateOwnsCv('cand-aaa', otherUrl, otherId);
    expect(result.ok).toBe(false);
  });
});

describe('application CV ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({
      tokenVersion: 0,
      isSuspended: false,
      deletedAt: null,
      hospital: null,
    });
    mockJobFindUnique.mockResolvedValue(openJob);
    mockApplicationFindUnique.mockResolvedValue(null);
    mockCandidateFindUnique.mockResolvedValue({ id: 'cand-aaa', profileJson: { name: 'Test' } });
  });

  it('accepts own legitimately uploaded CV URL on application create', async () => {
    const candidateId = 'cand-aaa';
    const publicId = `candidates/cv/${candidateId}_1710000000000`;
    const cvUrl = `https://res.cloudinary.com/demo/raw/upload/v1/${publicId}.pdf`;

    mockApplicationCreate.mockResolvedValue({
      id: 'app-new',
      jobId: 'job-1',
      candidateId,
      status: 'Applied',
      candidate: { name: 'Candidate' },
      job: { role: 'Physician', hospitalId: 'hosp-1', hospital: { name: 'H' } },
    });
    mockCandidateUpdate.mockResolvedValue({ id: candidateId, name: 'Candidate' });

    const res = await request(createApp())
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidateToken(candidateId)}`)
      .send({
        jobId: 'job-1',
        cvSource: 'upload',
        cvUrl,
        cvCloudinaryId: publicId,
        cvName: 'cv.pdf',
        cvMime: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(mockApplicationCreate).toHaveBeenCalled();
  });

  it('rejects another candidate CV URL on application create with 400', async () => {
    const res = await request(createApp())
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidateToken('cand-aaa')}`)
      .send({
        jobId: 'job-1',
        cvSource: 'upload',
        cvUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/candidates/cv/cand-bbb_1710000000000.pdf',
        cvCloudinaryId: 'candidates/cv/cand-bbb_1710000000000',
        cvName: 'cv.pdf',
        cvMime: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not belong/i);
    expect(mockApplicationCreate).not.toHaveBeenCalled();
  });

  it('rejects CV upload application when candidate has not filled form', async () => {
    const candidateId = 'cand-aaa';
    const publicId = `candidates/cv/${candidateId}_1710000000000`;
    const cvUrl = `https://res.cloudinary.com/demo/raw/upload/v1/${publicId}.pdf`;

    mockCandidateFindUnique.mockResolvedValue({ id: candidateId, profileJson: null });

    const res = await request(createApp())
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidateToken(candidateId)}`)
      .send({
        jobId: 'job-1',
        cvSource: 'upload',
        cvUrl,
        cvCloudinaryId: publicId,
        cvName: 'cv.pdf',
        cvMime: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/You must fill up the structured form/i);
    expect(mockApplicationCreate).not.toHaveBeenCalled();
  });

  it('CV proxy rejects mismatched stored URL even if it bypassed create validation', async () => {
    const foreignUrl = 'https://res.cloudinary.com/demo/raw/upload/v1/candidates/cv/cand-bbb_1710000000000.pdf';
    mockApplicationFindUnique.mockResolvedValue({
      id: 'app-1',
      candidateId: 'cand-aaa',
      cvSource: 'upload',
      uploadedCvData: null,
      cvUrl: foreignUrl,
      cvCloudinaryId: 'candidates/cv/cand-bbb_1710000000000',
      uploadedCvMime: 'application/pdf',
      uploadedCvName: 'cv.pdf',
      job: { hospitalId: 'hosp-1' },
      candidate: { cvUrl: foreignUrl, cvCloudinaryId: 'candidates/cv/cand-bbb_1710000000000' },
    });
    mockUserFindUnique.mockResolvedValue({
      tokenVersion: 0,
      isSuspended: false,
      deletedAt: null,
      hospital: { isSuspended: false, deletedAt: null },
    });

    const res = await request(createApp())
      .get('/api/applications/app-1/uploaded-cv')
      .set('Authorization', `Bearer ${recruiterToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not belong/i);
  });
});
