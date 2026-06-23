import { describe, it, expect } from 'vitest';
import { isExactMatch } from '../routes/candidateRoutes';

describe('isExactMatch helper function', () => {
  it('returns true when query is empty', () => {
    const candidate = { name: 'Dr. Dmitry', specialty: 'Pediatrics' };
    expect(isExactMatch(candidate, '')).toBe(true);
    expect(isExactMatch(candidate, '   ')).toBe(true);
  });

  it('matches whole words in candidate name, role, and specialty', () => {
    const candidate = {
      name: 'Dr. Dmitry',
      role: 'Consultant Pediatrician',
      specialty: 'Pediatrics'
    };

    // Substring "Pediatric" matches "Pediatrician", but whole-word matches should fail/pass based on boundaries
    expect(isExactMatch(candidate, 'Dmitry')).toBe(true);
    expect(isExactMatch(candidate, 'Pediatrics')).toBe(true);
    // Substring "Ped" is inside "Pediatrics", so it should fail whole-word match
    expect(isExactMatch(candidate, 'Ped')).toBe(false);
    // Substring "Dmit" is inside "Dmitry", so it should fail whole-word match
    expect(isExactMatch(candidate, 'Dmit')).toBe(false);
  });

  it('correctly matches whole words for degrees and qualifications in education JSON field', () => {
    const candidate = {
      name: 'Dr. John Doe',
      education: [
        { degree: 'DM Cardiology', institution: 'AIIMS' },
        { degree: 'MD', institution: 'KMC' }
      ]
    };

    // Exact whole-word matches should succeed
    expect(isExactMatch(candidate, 'DM')).toBe(true);
    expect(isExactMatch(candidate, 'MD')).toBe(true);
    expect(isExactMatch(candidate, 'Cardiology')).toBe(true);

    // Substrings that are not whole words should fail
    expect(isExactMatch(candidate, 'Car')).toBe(false);
    expect(isExactMatch(candidate, 'Cardio')).toBe(false);
  });

  it('matches skills when provided as JSON array or string list', () => {
    const candidate = {
      name: 'Dr. Jane Smith',
      skills: ['Echocardiography', 'Angioplasty']
    };

    expect(isExactMatch(candidate, 'Angioplasty')).toBe(true);
    expect(isExactMatch(candidate, 'Angio')).toBe(false);
  });

  it('handles multi-word queries correctly by ensuring all terms are matched as whole words', () => {
    const candidate = {
      name: 'Dr. Dmitry DM',
      specialty: 'Cardiology',
      education: [{ degree: 'DM Cardiology' }]
    };

    expect(isExactMatch(candidate, 'DM Cardiology')).toBe(true);
    expect(isExactMatch(candidate, 'Dmitry Cardiology')).toBe(true);
    // "Dmit" and "Cardiology" has one word that is only a substring, so it should fail
    expect(isExactMatch(candidate, 'Dmit Cardiology')).toBe(false);
  });
});
