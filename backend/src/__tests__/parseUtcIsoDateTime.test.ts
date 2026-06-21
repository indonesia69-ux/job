import { describe, it, expect } from 'vitest';
import { parseUtcIsoDateTime } from '../lib/parseUtcIsoDateTime';

describe('parseUtcIsoDateTime', () => {
  it('rejects datetime strings without explicit timezone', () => {
    const result = parseUtcIsoDateTime('2026-06-21T14:30:00', 'interviewDate');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('explicit timezone');
    }
  });

  it('accepts ISO strings with Z suffix and stores UTC instant', () => {
    const result = parseUtcIsoDateTime('2026-12-01T10:30:00.000Z', 'interviewDate');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.date.toISOString()).toBe('2026-12-01T10:30:00.000Z');
    }
  });
});
