import type { DisplayApplicationStatus } from "../lib/applicationStatus";

export type ApplicationStatus = DisplayApplicationStatus;

export type Application = {
  id: string;
  jobId: string;
  role: string;
  hospital: string;
  city: string;
  appliedOn: string;
  status: ApplicationStatus;
  lastUpdate: string;

  // ── New Recruitment Workflow Fields ──
  interviewDate?: string | null;
  interviewType?: string | null;
  meetingLink?: string | null;
  venue?: string | null;
  interviewerName?: string | null;
  interviewerEmail?: string | null;
  interviewNotes?: string | null;
  interviewRound?: number;
  interviewHistory?: any;
  candidateResponseNote?: string | null;
  interviewOutcomeNote?: string | null;
  requestedDocumentList?: string[];
  documentRequestNote?: string | null;
  offerLetterUrl?: string | null;
  offerLetterCloudinaryId?: string | null;
  joiningDate?: string | null;
  joiningNote?: string | null;
  finalStatusNote?: string | null;
  applicationDocuments?: any[];
};
