import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHospitalUpdate = vi.fn();
const mockUserUpdateMany = vi.fn();
const mockJobFindMany = vi.fn();
const mockApplicationUpdateMany = vi.fn();
const mockJobUpdateMany = vi.fn();
const mockActivityLogCreate = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    hospital: { update: (...args: unknown[]) => mockHospitalUpdate(...args) },
    user: { updateMany: (...args: unknown[]) => mockUserUpdateMany(...args) },
    job: {
      findMany: (...args: unknown[]) => mockJobFindMany(...args),
      updateMany: (...args: unknown[]) => mockJobUpdateMany(...args),
    },
    application: { updateMany: (...args: unknown[]) => mockApplicationUpdateMany(...args) },
    activityLog: { create: (...args: unknown[]) => mockActivityLogCreate(...args) },
    $transaction: (ops: unknown[]) => Promise.all(ops),
  },
}));

import { suspendHospitalRecruitersAndCloseJobs } from '../lib/hospitalSuspend';

describe('suspendHospitalRecruitersAndCloseJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserUpdateMany.mockResolvedValue({ count: 1 });
    mockJobFindMany.mockResolvedValue([{ id: 'job-1' }]);
    mockApplicationUpdateMany.mockResolvedValue({ count: 1 });
    mockJobUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('suspends recruiters and closes active jobs with in-progress applications', async () => {
    await suspendHospitalRecruitersAndCloseJobs('hosp-1');

    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: { hospitalId: 'hosp-1', role: 'RECRUITER' },
      data: { isSuspended: true },
    });

    expect(mockApplicationUpdateMany).toHaveBeenCalledWith({
      where: {
        jobId: { in: ['job-1'] },
        status: {
          notIn: expect.arrayContaining(['JobClosed', 'Onboarded']),
        },
      },
      data: { status: 'JobClosed' },
    });

    const notInStatuses = mockApplicationUpdateMany.mock.calls[0][0].where.status.notIn as string[];
    expect(notInStatuses).not.toContain('InterviewScheduled');

    expect(mockJobUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['job-1'] } },
      data: { status: 'Closed' },
    });
  });
});
