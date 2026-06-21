import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockJobFindMany = vi.fn();
const mockJobFindFirst = vi.fn();
const mockAdminFindUnique = vi.fn();
const mockUserFindUnique = vi.fn();
const mockCandidateFindUnique = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    job: {
      findMany: (...args: unknown[]) => mockJobFindMany(...args),
      findFirst: (...args: unknown[]) => mockJobFindFirst(...args),
    },
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

const expiredHospital = {
  name: 'Expired Hospital',
  verified: true,
  about: 'About',
  isSuspended: false,
  deletedAt: null,
  planExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
  approvedAt: new Date('2019-01-01T00:00:00.000Z'),
  submittedAt: null,
};

const activeJobOnExpiredPlan = {
  id: 'job-expired-plan',
  hospitalId: 'hosp-expired',
  status: 'Active',
  role: 'Physician',
  specialty: 'Cardiology',
  location: 'Kolkata',
  type: 'Full-time',
  description: 'Test',
  salaryMin: 100000,
  salaryMax: 200000,
  visibilityEndsAt: null,
  hospital: expiredHospital,
  postedBy: { id: 'user-1', name: 'Recruiter', email: 'recruiter@hospital.in' },
  _count: { applications: 0 },
};

describe('plan-expired hospital public visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminFindUnique.mockResolvedValue(null);
    mockCandidateFindUnique.mockResolvedValue(null);
  });

  it('excludes jobs from expired-plan hospitals on public list', async () => {
    mockJobFindMany.mockResolvedValue([activeJobOnExpiredPlan]);

    const res = await request(createApp()).get('/api/jobs');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 404 on public job detail for expired-plan hospital', async () => {
    mockJobFindFirst.mockResolvedValue(activeJobOnExpiredPlan);
    mockUserFindUnique.mockResolvedValue(null);

    const res = await request(createApp()).get('/api/jobs/job-expired-plan');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Job not found');
  });

  it('still returns job for owning recruiter when plan is expired', async () => {
    mockJobFindFirst.mockResolvedValue(activeJobOnExpiredPlan);
    mockUserFindUnique.mockResolvedValue({
      tokenVersion: 0,
      isSuspended: false,
      deletedAt: null,
      hospital: { isSuspended: false, deletedAt: null },
    });

    const token = signToken({
      id: 'recruiter-1',
      email: 'r@test.com',
      name: 'Recruiter',
      role: 'RECRUITER',
      hospitalId: 'hosp-expired',
      tokenVersion: 0,
    });

    const res = await request(createApp())
      .get('/api/jobs/job-expired-plan')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('job-expired-plan');
    expect(res.body.status).toBe('Active');
  });

  it('includes job on recruiter hospital-scoped list when plan is expired', async () => {
    mockJobFindMany.mockResolvedValue([activeJobOnExpiredPlan]);
    mockUserFindUnique.mockResolvedValue({
      tokenVersion: 0,
      isSuspended: false,
      deletedAt: null,
      hospital: { isSuspended: false, deletedAt: null },
    });

    const token = signToken({
      id: 'recruiter-1',
      email: 'r@test.com',
      name: 'Recruiter',
      role: 'RECRUITER',
      hospitalId: 'hosp-expired',
      tokenVersion: 0,
    });

    const res = await request(createApp())
      .get('/api/jobs')
      .query({ hospitalId: 'hosp-expired' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('job-expired-plan');
  });
});
