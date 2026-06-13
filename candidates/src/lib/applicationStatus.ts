export const ALL_STATUSES = [
  "Applied",
  "Reviewed",
  "InterviewScheduled",
  "InterviewAccepted",
  "InterviewDeclined",
  "RescheduleRequested",
  "InterviewCompleted",
  "NoShow",
  "InterviewRescheduled",
  "Shortlisted",
  "OnHold",
  "NextRound",
  "Rejected",
  "DocumentsRequested",
  "DocumentsUploaded",
  "DocumentsApproved",
  "AdditionalDocumentsRequired",
  "DocumentsRejected",
  "OfferSent",
  "OfferAccepted",
  "OfferRejected",
  "JoiningConfirmed",
  "Joined",
  "Onboarded",
  "Dropped",
  "JobClosed",
] as const;

export type ApiApplicationStatus = (typeof ALL_STATUSES)[number];
export type DisplayApplicationStatus = string;

const STATUS_DISPLAY_MAP: Record<string, string> = {
  Applied: "Applied",
  Reviewed: "Reviewed",
  InterviewScheduled: "Interview Scheduled",
  InterviewAccepted: "Interview Accepted",
  InterviewDeclined: "Interview Declined",
  RescheduleRequested: "Reschedule Requested",
  InterviewCompleted: "Interview Completed",
  NoShow: "No Show",
  InterviewRescheduled: "Interview Rescheduled",
  Shortlisted: "Shortlisted",
  OnHold: "On Hold",
  NextRound: "Next Round",
  Rejected: "Rejected",
  DocumentsRequested: "Documents Requested",
  DocumentsUploaded: "Documents Uploaded",
  DocumentsApproved: "Documents Approved",
  AdditionalDocumentsRequired: "Additional Docs Required",
  DocumentsRejected: "Documents Rejected",
  OfferSent: "Offer Sent",
  OfferAccepted: "Offer Accepted",
  OfferRejected: "Offer Rejected",
  JoiningConfirmed: "Joining Confirmed",
  Joined: "Joined",
  Onboarded: "Onboarded",
  Dropped: "Dropped",
  JobClosed: "Job Closed",
};

/** Candidate-facing timeline high-level milestones. */
export const CANDIDATE_STATUS_STEPS = [
  "Applied",
  "Reviewed",
  "Interview",
  "Documents",
  "Offer & Joining",
];

export function apiToDisplayStatus(api: string): DisplayApplicationStatus {
  if (api === "New") return "Applied";
  if (api === "Contacted") return "Offer Sent"; // Legacy mapping
  return STATUS_DISPLAY_MAP[api] || api;
}

const TERMINAL_STATUSES: string[] = [
  "Onboarded",
  "Dropped",
  "OfferRejected",
  "DocumentsRejected",
  "Rejected",
  "InterviewDeclined",
  "JobClosed",
];

export function isTerminalApplicationStatus(status: string): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isLockedApplicationStatus(status: string): boolean {
  return isTerminalApplicationStatus(status);
}

export function statusPillClass(status: string): string {
  const s = status.toLowerCase();

  if (isTerminalApplicationStatus(status) && !["onboarded"].includes(s)) {
    return "bg-destructive/15 text-destructive border-destructive/30";
  }

  if (s.includes("interview") || s === "reschedule requested") {
    return "bg-indigo-500/15 text-indigo-700 border-indigo-500/30";
  }

  if (s.includes("document")) {
    return "bg-amber-500/15 text-amber-900 border-amber-500/30";
  }

  if (s.includes("offer") || s.includes("join") || s === "shortlisted" || s === "onboarded") {
    return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  }

  if (s === "reviewed") return "bg-sky-500/15 text-sky-800 border-sky-500/30";
  if (s === "applied" || s === "new") return "bg-muted text-foreground border-border";
  return "bg-muted text-muted-foreground border-border";
}

export function timelineStepIndex(apiStatus: string): number {
  if (apiStatus === "Applied" || apiStatus === "New") return 0;
  if (apiStatus === "Reviewed") return 1;

  if (
    apiStatus.includes("Interview") ||
    apiStatus.includes("Reschedule") ||
    apiStatus === "NoShow" ||
    apiStatus === "Shortlisted" ||
    apiStatus === "OnHold" ||
    apiStatus === "NextRound"
  ) {
    return 2;
  }

  if (apiStatus.includes("Document")) {
    return 3;
  }

  if (apiStatus.includes("Offer") || apiStatus.includes("Join") || apiStatus === "Onboarded") {
    return 4;
  }

  // For Rejected or Dropped, return the step they were dropped AT, or default 1
  return 1;
}
