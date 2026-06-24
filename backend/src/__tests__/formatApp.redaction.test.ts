import { describe, it, expect } from 'vitest';
import { formatApp } from '../lib/helpers';

describe('formatApp recruiter PII redaction', () => {
  const rawApp = {
    id: 'app-1',
    status: 'Applied',
    cvUrl: 'https://res.cloudinary.com/x/cv.pdf',
    cvCloudinaryId: 'cv_123',
    uploadedCvData: { name: 'cv.pdf' },
    interviewerEmail: 'interviewer@hospital.in',
    customFieldResponses: JSON.stringify({ phone: '+919876543210', answer: 'yes' }),
    supportingDocuments: JSON.stringify([{ name: 'license.pdf', url: 'https://example.com/doc.pdf' }]),
    candidate: {
      id: 'cand-1',
      name: 'Dr. Test',
      email: 'candidate@secret.com',
      phone: '+919876543210',
    },
    job: { id: 'job-1', role: 'Physician', hospital: { name: 'Test Hospital' } },
  };

  it('nulls/scrubs PII fields for recruiter view', () => {
    const formatted = formatApp(rawApp, { redactCandidateContact: true });

    expect(formatted.cvUrl).toBeNull();
    expect(formatted.interviewerEmail).toBeNull();
    expect(formatted.customFieldResponses).toEqual({ phone: '+919876543210', answer: 'yes' });
    expect(formatted.supportingDocuments).toEqual([
      { name: 'license.pdf', url: 'https://example.com/doc.pdf' },
    ]);
    expect(formatted.candidate.email).toBeUndefined();
  });

  it('preserves fields for candidate/admin view', () => {
    const formatted = formatApp(rawApp, { redactCandidateContact: false });

    expect(formatted.interviewerEmail).toBe('interviewer@hospital.in');
    expect(formatted.customFieldResponses).toEqual({ phone: '+919876543210', answer: 'yes' });
    expect(formatted.supportingDocuments).toEqual([
      { name: 'license.pdf', url: 'https://example.com/doc.pdf' },
    ]);
    expect(formatted.candidate.email).toBe('candidate@secret.com');
  });
});
