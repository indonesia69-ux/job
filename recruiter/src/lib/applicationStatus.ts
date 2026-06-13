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
export type DisplayApplicantStatus = string;

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

// Legacy fallback maps for "New" -> "Applied"
export function apiToDisplayStatus(api: string): DisplayApplicantStatus {
  if (api === "New") return "Applied";
  if (api === "Contacted") return "Offer Sent"; // Legacy mapping
  return STATUS_DISPLAY_MAP[api] || api;
}

export function displayToApiStatus(display: string): ApiApplicationStatus {
  if (display === "Applied") return "Applied"; // previously "New"
  if (display === "Job closed") return "JobClosed";
  // Inverse lookup
  const entry = Object.entries(STATUS_DISPLAY_MAP).find(([k, v]) => v === display);
  return (entry ? entry[0] : display) as ApiApplicationStatus;
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

export function statusPillClass(status: string): string {
  const s = status.toLowerCase();

  if (isTerminalApplicationStatus(status) && !["onboarded"].includes(s)) {
    return "bg-destructive/15 text-destructive border border-destructive/30";
  }

  if (s.includes("interview") || s === "reschedule requested") {
    return "bg-indigo-500/15 text-indigo-800 border border-indigo-500/30";
  }

  if (s.includes("document")) {
    return "bg-amber-500/15 text-amber-950 border border-amber-500/30";
  }

  if (s.includes("offer") || s.includes("join") || s === "shortlisted" || s === "onboarded") {
    return "bg-emerald-500/15 text-emerald-800 border border-emerald-500/30";
  }

  if (s === "reviewed") return "bg-sky-500/15 text-sky-900 border border-sky-500/30";
  if (s === "applied" || s === "new") return "bg-muted text-foreground border border-border";
  return "bg-muted text-muted-foreground border border-border";
}
