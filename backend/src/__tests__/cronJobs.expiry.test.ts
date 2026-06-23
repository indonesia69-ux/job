import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApplicationUpdateMany = vi.fn();
const mockJobUpdateMany = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    application: { updateMany: (...args: unknown[]) => mockApplicationUpdateMany(...args) },
    job: { updateMany: (...args: unknown[]) => mockJobUpdateMany(...args) },
    $transaction: (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]),
  },
}));

import { closeExpiredJobs } from '../lib/hospitalSuspend';

describe('closeExpiredJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApplicationUpdateMany.mockResolvedValue({ count: 1 });
    mockJobUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('closes InterviewScheduled applications when a job expires via cron', async () => {
    await closeExpiredJobs(['job-1']);

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
  });
});
