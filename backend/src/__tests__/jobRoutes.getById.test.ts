import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockJobFindFirst = vi.fn();
const mockAdminFindUnique = vi.fn();
const mockUserFindUnique = vi.fn();
const mockCandidateFindUnique = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    job: { findFirst: (...args: unknown[]) => mockJobFindFirst(...args) },
    adminUser: { findUnique: (...args: unknown[]) => mockAdminFindUnique(...args) },
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    candidate: { findUnique: (...args: unknown[]) => mockCandidateFindUnique(...args) },
  },
}));

vi.mock('../lib/notifyAdmin', () => ({ notifyAdminJobPublished: vi.fn() }));
vi.mock('../lib/sseManager', () => ({ sseManager: { broadcastToAdmins: vi.fn() } }));

import jobRoutes from '../routes/jobRoutes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/jobs', jobRoutes);
  return app;
}

function signToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, process.env.JWT_SECRET!);
}

const baseJob = {
  hospitalId: 'hosp-1',
  role: 'Physician',
  specialty: 'Cardiology',
  location: 'Kolkata',
  type: 'Full-time',
  description: 'Test',
  salaryMin: 100000,
  salaryMax: 200000,
  hospital: {
    name: 'Test Hospital',
    verified: true,
    about: 'About',
    isSuspended: false,
    deletedAt: null,
    planExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
    approvedAt: new Date('2024-01-01T00:00:00.000Z'),
    submittedAt: null,
  },
  postedBy: { id: 'user-1', name: 'Recruiter', email: 'recruiter-secret@hospital.in' },
  _count: { applications: 0 },
};

const draftJob = { ...baseJob, id: 'draft-job-id', status: 'Draft' };

describe('GET /api/jobs/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminFindUnique.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue(null);
    mockCandidateFindUnique.mockResolvedValue(null);
    mockJobFindFirst.mockResolvedValue(draftJob);
  });

  it('returns 404 for anonymous request to a Draft job', async () => {
    const res = await request(createApp()).get('/api/jobs/draft-job-id');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Job not found');
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for candidate JWT on a Draft job (isOwnerRecruiter must stay false)', async () => {
    const token = signToken({
      id: 'candidate-1',
      email: 'c@test.com',
      name: 'Candidate',
      role: 'CANDIDATE',
      candidateId: 'cand-1',
      tokenVersion: 0,
    });
    mockCandidateFindUnique.mockResolvedValue({ id: 'cand-1', profileJson: null, role: 'Nurse', experienceYears: 2, location: 'Kolkata', skills: '[]' });

    const res = await request(createApp())
      .get('/api/jobs/draft-job-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for recruiter JWT with hospitalId null on a Draft job', async () => {
    const token = signToken({
      id: 'recruiter-1',
      email: 'r@test.com',
      name: 'Recruiter',
      role: 'RECRUITER',
      hospitalId: null,
      tokenVersion: 0,
    });

    const res = await request(createApp())
      .get('/api/jobs/draft-job-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    // canViewHospitalJobs rejects before DB lookup when hospitalId is null
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for recruiter JWT with wrong hospital on a Draft job', async () => {
    const token = signToken({
      id: 'recruiter-1',
      email: 'r@test.com',
      name: 'Recruiter',
      role: 'RECRUITER',
      hospitalId: 'other-hosp',
      tokenVersion: 0,
    });

    const res = await request(createApp())
      .get('/api/jobs/draft-job-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('returns 200 for owning recruiter on a Draft job', async () => {
    const token = signToken({
      id: 'recruiter-1',
      email: 'r@test.com',
      name: 'Recruiter',
      role: 'RECRUITER',
      hospitalId: 'hosp-1',
      tokenVersion: 0,
    });
    mockUserFindUnique.mockResolvedValue({
      tokenVersion: 0,
      isSuspended: false,
      deletedAt: null,
      hospital: { isSuspended: false, deletedAt: null },
    });

    const res = await request(createApp())
      .get('/api/jobs/draft-job-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Draft');
    expect(res.body.postedBy.email).toBe('recruiter-secret@hospital.in');
  });

  it('returns 200 for anonymous request to an Active job and redacts poster email', async () => {
    mockJobFindFirst.mockResolvedValue({ ...baseJob, id: 'active-job-id', status: 'Active' });

    const res = await request(createApp()).get('/api/jobs/active-job-id');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('active-job-id');
    expect(res.body.status).toBe('Active');
    expect(res.body.postedBy).toEqual({ id: 'user-1', name: 'Recruiter' });
    expect(res.body.postedBy.email).toBeUndefined();
  });
});
