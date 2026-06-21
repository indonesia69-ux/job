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

vi.mock('../lib/email', () => ({ sendOfferLetterEmail: vi.fn() }));

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
      email: 'r@test.com',
      name: 'Recruiter',
      role: 'RECRUITER',
      hospitalId,
      tokenVersion: 0,
    },
    process.env.JWT_SECRET!,
  );
}

const baseApp = {
  id: 'app-1',
  status: 'Shortlisted',
  candidateId: 'cand-1',
  job: { id: 'job-1', hospitalId: 'hosp-1', role: 'Physician', hospital: { name: 'H' } },
  candidate: { id: 'cand-1', name: 'Candidate', userId: 'u2' },
  interviewRound: 1,
  interviewHistory: null,
  interviewDate: null,
  interviewType: null,
  meetingLink: null,
  venue: null,
  interviewerName: null,
  interviewerEmail: null,
  interviewNotes: null,
};

describe('PATCH /api/applications/:id recruiter optimistic lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({
      tokenVersion: 0,
      isSuspended: false,
      deletedAt: null,
      hospital: { isSuspended: false, deletedAt: null },
    });
    mockApplicationFindUnique.mockResolvedValue(baseApp);
    mockApplicationUpdate.mockResolvedValue({ ...baseApp, status: 'Reviewed' });
  });

  it('returns 400 when currentStatus is missing for recruiter updates', async () => {
    const res = await request(createApp())
      .patch('/api/applications/app-1')
      .set('Authorization', `Bearer ${recruiterToken('hosp-1')}`)
      .send({ status: 'Reviewed' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('currentStatus is required');
    expect(mockApplicationUpdate).not.toHaveBeenCalled();
  });

  it('returns 409 when currentStatus is stale', async () => {
    const res = await request(createApp())
      .patch('/api/applications/app-1')
      .set('Authorization', `Bearer ${recruiterToken('hosp-1')}`)
      .send({ status: 'Reviewed', currentStatus: 'Applied' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('status has changed');
    expect(mockApplicationUpdate).not.toHaveBeenCalled();
  });
});
