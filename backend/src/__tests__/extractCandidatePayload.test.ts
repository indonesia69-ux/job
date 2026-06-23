import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const mockUserFindUnique = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
  },
}));

import { extractCandidatePayload } from '../lib/helpers';

describe('extractCandidatePayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for a valid JWT when the user is suspended (treat as unauthenticated)', async () => {
    const token = jwt.sign(
      {
        id: 'user-1',
        email: 'c@test.com',
        name: 'Candidate',
        role: 'CANDIDATE',
        candidateId: 'cand-1',
        tokenVersion: 0,
      },
      process.env.JWT_SECRET!,
    );

    mockUserFindUnique.mockResolvedValue({
      tokenVersion: 0,
      isSuspended: true,
      deletedAt: null,
      hospital: null,
    });

    const result = await extractCandidatePayload(`Bearer ${token}`, process.env.JWT_SECRET!);

    expect(result).toBeNull();
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: {
        tokenVersion: true,
        isSuspended: true,
        deletedAt: true,
        hospital: { select: { isSuspended: true, deletedAt: true } },
      },
    });
  });
});
