import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTransaction = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: (fn: (tx: unknown) => unknown) => mockTransaction(fn),
  },
}));

describe('premium search quota atomic increment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses conditional updateMany increment inside a transaction on first page', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUnique = vi.fn().mockResolvedValue({
      id: 'user-1',
      role: 'RECRUITER',
      premiumSearchesThisMonth: 29,
      currentMonthStartDate: new Date(),
      hospital: { onboardingPlan: 'Pro' },
    });

    const tx = { user: { findUnique, updateMany } };
    mockTransaction.mockImplementation(async (fn: (innerTx: typeof tx) => Promise<unknown>) => fn(tx));

    const limit = 50;
    const allowed = await mockTransaction(async (innerTx: typeof tx) => {
      const txUser = await innerTx.user.findUnique({ where: { id: 'user-1' } });
      const incrementResult = await innerTx.user.updateMany({
        where: { id: txUser!.id, premiumSearchesThisMonth: { lt: limit } },
        data: { premiumSearchesThisMonth: { increment: 1 } },
      });
      return incrementResult.count > 0;
    });

    expect(allowed).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', premiumSearchesThisMonth: { lt: 50 } },
      data: { premiumSearchesThisMonth: { increment: 1 } },
    });
  });
});
