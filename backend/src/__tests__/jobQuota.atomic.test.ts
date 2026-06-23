import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUserFindUnique = vi.fn();
const mockUserUpdateMany = vi.fn();
const mockJobCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      updateMany: (...args: unknown[]) => mockUserUpdateMany(...args),
    },
    job: { create: (...args: unknown[]) => mockJobCreate(...args) },
    $transaction: (fn: (tx: unknown) => unknown) => mockTransaction(fn),
  },
}));

describe('job posting quota atomic increment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses conditional updateMany increment inside the transaction (atomic quota check)', async () => {
    const tx = {
      user: {
        findUnique: mockUserFindUnique,
        updateMany: mockUserUpdateMany,
      },
      job: { create: mockJobCreate },
    };

    mockUserFindUnique.mockResolvedValue({
      id: 'user-1',
      role: 'RECRUITER',
      jobsPostedThisMonth: 3,
      currentMonthStartDate: new Date(),
    });
    mockUserUpdateMany.mockResolvedValue({ count: 1 });
    mockJobCreate.mockResolvedValue({ id: 'job-new' });

    mockTransaction.mockImplementation(async (fn: (innerTx: typeof tx) => Promise<unknown>) => fn(tx));

    const limit = 4;
    await mockTransaction(async (innerTx: typeof tx) => {
      const user = await innerTx.user.findUnique({ where: { id: 'user-1' } });
      const incrementResult = await innerTx.user.updateMany({
        where: {
          id: user!.id,
          jobsPostedThisMonth: { lt: limit },
        },
        data: { jobsPostedThisMonth: { increment: 1 } },
      });
      if (incrementResult.count === 0) {
        throw new Error('QUOTA_EXCEEDED');
      }
      return innerTx.job.create({ data: { hospitalId: 'hosp-1' } as never });
    });

    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', jobsPostedThisMonth: { lt: 4 } },
      data: { jobsPostedThisMonth: { increment: 1 } },
    });
    expect(mockJobCreate).toHaveBeenCalled();
  });

  it('throws QUOTA_EXCEEDED when conditional increment updates zero rows', async () => {
    const tx = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'user-1', jobsPostedThisMonth: 4 }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      job: { create: vi.fn() },
    };

    mockTransaction.mockImplementation(async (fn: (innerTx: typeof tx) => Promise<unknown>) => fn(tx));

    await expect(
      mockTransaction(async (innerTx: typeof tx) => {
        const user = await innerTx.user.findUnique({ where: { id: 'user-1' } });
        const incrementResult = await innerTx.user.updateMany({
          where: { id: user!.id, jobsPostedThisMonth: { lt: 4 } },
          data: { jobsPostedThisMonth: { increment: 1 } },
        });
        if (incrementResult.count === 0) throw new Error('QUOTA_EXCEEDED');
        return innerTx.job.create({ data: {} as never });
      }),
    ).rejects.toThrow('QUOTA_EXCEEDED');
  });
});
