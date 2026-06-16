import { apiBase } from "@/lib/api";
import { authHeader, getUser, logout } from "@/store/authStore";
import type { ApplicantStatus, Candidate } from "@/lib/mock";
import type { FormProfile } from "@/lib/formProfile";
import {
  apiToDisplayStatus,
  displayToApiStatus,
  type ApiApplicationStatus,
  type DisplayApplicantStatus,
} from "@/lib/applicationStatus";
import {
  formatResponseValue,
  type CustomFieldResponses,
  type JobCustomField,
} from "@/lib/jobCustomFields";

function safeJsonParse<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapStatus(apiStatus: string): ApplicantStatus {
  const display = apiToDisplayStatus(apiStatus);
  return display as ApplicantStatus;
}

function mapFromFormProfile(
  profile: FormProfile,
  app: {
    id: string;
    status: string;
    appliedOn: string;
    jobId: string;
    candidate: Record<string, unknown>;
  },
): Candidate {
  const c = app.candidate;
  const initials =
    profile.avatar ||
    String(profile.name || "HP")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return {
    id: String(c.id),
    name: profile.name,
    initials,
    role: profile.role,
    specialty: profile.specialty || profile.clinicalSkills?.[0] || profile.role,
    experienceYears: profile.yearsExperience,
    location: profile.state || profile.city,
    currentEmployer: profile.experience?.[0]?.hospital || "",
    summary: profile.summary,
    status: mapStatus(app.status),
    appliedTo: app.jobId,
    appliedOn: new Date(app.appliedOn).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    matchPercent: Number(c.matchPercent || profile.completeness || 75),
    verified: Boolean(profile.verified),
    registration: profile.registrationNumber
      ? `${profile.registrationNumber}${profile.registrationCouncil ? ` (${profile.registrationCouncil})` : ""}`
      : "",
    languages: profile.languages || [],
    procedures: (profile.procedures || []).map((p) =>
      typeof p === "string" ? p : `${p.name}${p.count ? ` (${p.count})` : ""}`,
    ),
    skills: [...(profile.clinicalSkills || []), ...(profile.technicalSkills || [])],
    education: (profile.qualifications || []).map((e) => ({
      degree: e.degree,
      institute: e.institution,
      year: e.year,
    })),
    certifications: (profile.certifications || []).map(
      (cert) =>
        `${cert.name}${cert.issuer ? ` · ${cert.issuer}` : ""}${cert.year ? ` (${cert.year})` : ""}`,
    ),
    experience: (profile.experience || []).map((e) => ({
      role: e.role,
      employer: e.hospital,
      location: e.city,
      period: [e.start, e.current ? "Present" : e.end].filter(Boolean).join(" — "),
      highlights: [
        e.summary,
        e.specialty ? `Specialty focus: ${e.specialty}` : "",
        e.patientLoad ? `Patient load: ${e.patientLoad}` : "",
        e.rota ? `Rota: ${e.rota}` : "",
      ].filter(Boolean),
    })),
    applicationId: app.id,
    cvSource: "form",
    formProfile: profile,
    supportingDocuments: safeJsonParse<any[]>(
      (app as any).supportingDocuments || c.supportingDocuments || undefined,
      [],
    ),
  } as Candidate;
}

function resolveCustomAnswers(
  fields: JobCustomField[],
  responses: CustomFieldResponses,
): { fieldId: string; label: string; value: string; required: boolean }[] {
  return fields.map((f) => ({
    fieldId: f.id,
    label: f.label,
    required: f.required,
    value: formatResponseValue(responses[f.id]),
  }));
}

export function mapApiCandidate(app: {
  id: string;
  status: string;
  appliedOn: string;
  jobId: string;
  cvSource?: string;
  customFieldResponses?: CustomFieldResponses;
  job?: { customApplicationFields?: JobCustomField[] };
  candidate: Record<string, unknown>;
  // New workflow fields
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
}): Candidate {
  const c = app.candidate;
  const appCvSource = app.cvSource || (c.cvSource as string);
  const profile = c.profile as FormProfile | null | undefined;
  const jobFields = app.job?.customApplicationFields || [];
  const customAnswers = resolveCustomAnswers(
    jobFields,
    (app.customFieldResponses || {}) as CustomFieldResponses,
  );

  const workflowFields = {
    interviewDate: app.interviewDate,
    interviewType: app.interviewType,
    meetingLink: app.meetingLink,
    venue: app.venue,
    interviewerName: app.interviewerName,
    interviewerEmail: app.interviewerEmail,
    interviewNotes: app.interviewNotes,
    interviewRound: app.interviewRound,
    interviewHistory: app.interviewHistory,
    candidateResponseNote: app.candidateResponseNote,
    interviewOutcomeNote: app.interviewOutcomeNote,
    requestedDocumentList: app.requestedDocumentList,
    documentRequestNote: app.documentRequestNote,
    offerLetterUrl: app.offerLetterUrl,
    offerLetterCloudinaryId: app.offerLetterCloudinaryId,
    joiningDate: app.joiningDate,
    joiningNote: app.joiningNote,
    finalStatusNote: app.finalStatusNote,
    applicationDocuments: app.applicationDocuments,
  };

  if (profile && appCvSource !== "upload") {
    const mapped = mapFromFormProfile(profile, app);
    return { ...mapped, customAnswers, ...workflowFields } as Candidate;
  }

  const education = safeJsonParse<
    { degree: string; institution?: string; institute?: string; year: string }[]
  >(c.education as string | undefined, []);
  const experience = safeJsonParse<
    {
      role: string;
      hospital?: string;
      employer?: string;
      city?: string;
      location?: string;
      start?: string;
      end?: string;
      summary?: string;
      highlights?: string[];
    }[]
  >(c.experience as string | undefined, []);
  const certifications = safeJsonParse<
    { name: string; issuer?: string; year?: string }[] | string[]
  >(c.certifications as string | undefined, []);

  return {
    id: String(c.id),
    name: String(c.name || "Candidate"),
    initials: String(c.initials || "—"),
    role: String(c.role || "Healthcare Professional"),
    specialty: String(c.specialty || "General"),
    experienceYears: Number(c.experienceYears || 0),
    location: String(c.location || ""),
    currentEmployer: String(c.currentEmployer || ""),
    summary: String(c.summary || ""),
    status: mapStatus(app.status),
    appliedTo: app.jobId,
    appliedOn: new Date(app.appliedOn).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    matchPercent: Number(c.matchPercent || 75),
    verified: Boolean(c.verified),
    registration: String(c.registration || ""),
    // email and phone intentionally omitted — redacted by backend for recruiters
    languages: safeJsonParse<string[]>(c.languages as string | undefined, []),
    procedures: safeJsonParse<string[] | { name: string; count?: number }[]>(
      c.procedures as string | undefined,
      [],
    ).map((p) => (typeof p === "string" ? p : `${p.name}${p.count ? ` (${p.count})` : ""}`)),
    skills: safeJsonParse<string[]>(c.skills as string | undefined, []),
    education: education.map((e) => ({
      degree: e.degree,
      institute: e.institution || e.institute || "",
      year: e.year,
    })),
    certifications: certifications.map((cert) =>
      typeof cert === "string"
        ? cert
        : `${cert.name}${cert.issuer ? ` · ${cert.issuer}` : ""}${cert.year ? ` (${cert.year})` : ""}`,
    ),
    experience: experience.map((e) => ({
      role: e.role,
      employer: e.hospital || e.employer || "",
      location: e.city || e.location || "",
      period: [e.start, e.end].filter(Boolean).join(" — ") || "",
      highlights: e.summary ? [e.summary] : e.highlights || [],
    })),
    applicationId: app.id,
    cvSource: appCvSource ? (appCvSource === "upload" ? "upload" : "form") : undefined,
    formProfile: profile || null,
    supportingDocuments: safeJsonParse<any[]>(
      (app as any).supportingDocuments ||
        (c.supportingDocuments as string | undefined) ||
        undefined,
      [],
    ),
    locked: c.locked as boolean | undefined,
    expectedSalaryMin: c.expectedSalaryMin as number | undefined,
    expectedSalaryMax: c.expectedSalaryMax as number | undefined,
    currentSalaryMin: c.currentSalaryMin as number | undefined,
    currentSalaryMax: c.currentSalaryMax as number | undefined,
    noticePeriod: c.noticePeriod as string | undefined,
    preferredLocations: safeJsonParse<string[]>(c.preferredLocations as string | undefined, []),
    availabilityStatus: c.availabilityStatus as string | undefined,
    customAnswers,
    ...workflowFields,
  } as Candidate;
}

export type DashboardStats = {
  kpis: { label: string; value: string; delta: string }[];
  chart: { week: string; jobs: number; applications: number }[];
  suggested: {
    id: string;
    name: string;
    initials: string;
    specialty: string;
    experienceYears: number;
    location: string;
    matchPercent: number;
  }[];
};

export type HospitalProfile = {
  id: string;
  name: string;
  shortName?: string | null;
  type?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  registrationNumber?: string | null;
  beds?: number | null;
  founded?: number | null;
  about?: string | null;
  specialties: string[];
  verified: boolean;
  verifiedOn?: string | null;
  verifiedBy?: string | null;
  profileComplete: boolean;
};

export async function loadHospitalProfile(): Promise<HospitalProfile | null> {
  const res = await fetch(`${apiBase()}/api/hospitals/me`, { headers: authHeader() });
  if (!res.ok) return null;
  return res.json();
}

export async function saveHospitalProfile(
  data: Partial<HospitalProfile>,
): Promise<HospitalProfile> {
  const res = await fetch(`${apiBase()}/api/hospitals/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to save hospital profile");
  }
  return res.json();
}

export async function loadDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${apiBase()}/api/dashboard/stats`, { headers: authHeader() });
  if (res.status === 401) {
    logout();
    if (typeof window !== "undefined") window.location.href = "/auth/login";
  }
  if (!res.ok) {
    return { kpis: [], chart: [], suggested: [] };
  }
  const data = await res.json();
  return {
    kpis: [
      { label: "Active Jobs", value: String(data.activeJobs || 0), delta: "Current" },
      { label: "Total Applicants", value: String(data.totalApplicants || 0), delta: "All time" },
      { label: "New Applicants", value: String(data.newApplicants || 0), delta: "Requires review" },
      { label: "Shortlisted", value: String(data.shortlisted || 0), delta: "In pipeline" },
    ],
    chart: Array.isArray(data.chart) ? data.chart : [],
    suggested: [],
  };
}

export type RecruiterDashboardData = {
  candidates: ReturnType<typeof mapApiCandidate>[];
  jobs: unknown[];
  totalCandidates: number;
  page: number;
  limit: number;
};

export async function loadRecruiterDashboard(
  page = 1,
  limit = 50,
  jobId?: string,
): Promise<RecruiterDashboardData> {
  const user = getUser();
  const headers = authHeader();
  const hospitalParam = user?.hospitalId ? `?hospitalId=${user.hospitalId}` : "";
  const jobParam = jobId ? `&jobId=${encodeURIComponent(jobId)}` : "";
  const [appsRes, jobsRes] = await Promise.all([
    fetch(`${apiBase()}/api/applications?page=${page}&limit=${limit}${jobParam}`, { headers }),
    fetch(`${apiBase()}/api/jobs${hospitalParam}`, { headers }),
  ]);

  if (appsRes.status === 401 || jobsRes.status === 401) {
    logout();
    if (typeof window !== "undefined") window.location.href = "/auth/login";
    return { candidates: [], jobs: [], totalCandidates: 0, page: 1, limit: 50 };
  }

  if (!appsRes.ok || !jobsRes.ok) {
    throw new Error("Failed to fetch dashboard data");
  }
  const applicationsData = await appsRes.json();
  const jobs = await jobsRes.json();

  // Handle backward compatibility or paginated response
  const appList = Array.isArray(applicationsData) ? applicationsData : applicationsData.data;
  const total = applicationsData.total || appList.length;
  const p = applicationsData.page || 1;
  const l = applicationsData.limit || 50;

  const candidates = appList.map((app: Parameters<typeof mapApiCandidate>[0]) =>
    mapApiCandidate(app),
  );
  return { candidates, jobs, totalCandidates: total, page: p, limit: l };
}

export async function closeJob(jobId: string): Promise<void> {
  const res = await fetch(`${apiBase()}/api/jobs/${jobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ status: "Closed" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to close job");
  }
}

export async function loadJob(jobId: string): Promise<any> {
  const res = await fetch(`${apiBase()}/api/jobs/${jobId}`, { headers: authHeader() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to load job");
  }
  return res.json();
}

export async function updateJob(jobId: string, payload: Record<string, any>): Promise<any> {
  const res = await fetch(`${apiBase()}/api/jobs/${jobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to update job");
  }
  return res.json();
}

export async function publishDraft(jobId: string): Promise<void> {
  const res = await fetch(`${apiBase()}/api/jobs/${jobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ status: "Active" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to publish draft");
  }
}

export async function updateApplicationStatus(
  applicationId: string,
  status: DisplayApplicantStatus | ApiApplicationStatus,
  payload: Record<string, any> = {},
): Promise<void> {
  const apiStatus =
    typeof status === "string" &&
    [
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
    ].includes(status)
      ? status
      : displayToApiStatus(status as DisplayApplicantStatus);

  const res = await fetch(`${apiBase()}/api/applications/${applicationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ status: apiStatus, ...payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to update status");
  }
}

export async function uploadOfferLetter(
  applicationId: string,
  file: File,
): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append("offerLetter", file);

  const res = await fetch(`${apiBase()}/api/applications/${applicationId}/offer-letter`, {
    method: "POST",
    headers: authHeader(), // Content-Type omitted so browser sets boundary
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to upload offer letter");
  }
  return res.json();
}

// ── Candidate search ──────────────────────────────────────────────────────────

export type SearchParams = {
  q?: string;
  role?: string;
  type?: "basic" | "premium" | "all";
  degrees?: string[];
  specialty?: string;
  experienceMin?: number;
  experienceMax?: number;
  location?: string;
  currentOrg?: string;
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  noticePeriod?: string[];
  currentSalaryMin?: number;
  currentSalaryMax?: number;
  preferredLocation?: string;
  availabilityStatus?: string[];
  take?: number;
  skip?: number;
};

export type SearchResult = {
  candidates: Candidate[];
  lockedCandidates?: Candidate[];
  total: number;
  take: number;
  skip: number;
};

export async function searchCandidates(params: SearchParams = {}): Promise<SearchResult> {
  const url = new URL(`${apiBase()}/api/candidates/search`);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.role && params.role !== "All") url.searchParams.set("role", params.role);
  if (params.type && params.type !== "all") url.searchParams.set("type", params.type);
  if (params.degrees?.length) url.searchParams.set("degrees", params.degrees.join(","));
  if (params.specialty) url.searchParams.set("specialty", params.specialty);
  if (params.experienceMin !== undefined)
    url.searchParams.set("experienceMin", String(params.experienceMin));
  if (params.experienceMax !== undefined)
    url.searchParams.set("experienceMax", String(params.experienceMax));
  if (params.location) url.searchParams.set("location", params.location);
  if (params.currentOrg) url.searchParams.set("currentOrg", params.currentOrg);
  if (params.expectedSalaryMin !== undefined)
    url.searchParams.set("expectedSalaryMin", String(params.expectedSalaryMin));
  if (params.expectedSalaryMax !== undefined)
    url.searchParams.set("expectedSalaryMax", String(params.expectedSalaryMax));
  if (params.noticePeriod?.length)
    url.searchParams.set("noticePeriod", params.noticePeriod.join(","));
  if (params.currentSalaryMin !== undefined)
    url.searchParams.set("currentSalaryMin", String(params.currentSalaryMin));
  if (params.currentSalaryMax !== undefined)
    url.searchParams.set("currentSalaryMax", String(params.currentSalaryMax));
  if (params.preferredLocation) url.searchParams.set("preferredLocation", params.preferredLocation);
  if (params.availabilityStatus?.length)
    url.searchParams.set("availabilityStatus", params.availabilityStatus.join(","));
  if (params.take) url.searchParams.set("take", String(params.take));
  if (params.skip) url.searchParams.set("skip", String(params.skip));

  const res = await fetch(url.toString(), { headers: authHeader() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Search failed");
  }
  const data = await res.json();
  // Map raw API candidates through the same mapper used for applications
  return {
    candidates: (data.candidates || []).map((c: any) =>
      mapApiCandidate({
        id: c.id,
        status: "Applied",
        appliedOn: new Date().toISOString(),
        jobId: "",
        candidate: c,
      }),
    ),
    ...(data.lockedCandidates && {
      lockedCandidates: data.lockedCandidates.map(
        (c: any) =>
          ({
            id: c.id,
            locked: true,
            specialty: c.specialty,
            experienceYears: c.experienceYears,
          }) as Candidate,
      ),
    }),
    total: data.total,
    take: data.take,
    skip: data.skip,
  };
}

// ── Plan management ───────────────────────────────────────────────────────────

export type PlanTier = "Basic" | "Pro" | "Premium";

export type PlanInfo = {
  plan: PlanTier;
  planExpiresAt: string | null;
  pendingPlan: PlanTier | null;
  pendingPlanAt: string | null;
  daysRemaining: number;
  planPrices: Record<string, number>;
  upgradeCostPreview: Record<string, number>;
};

export type PlanChangeEntry = {
  id: string;
  hospitalId: string;
  fromPlan: string;
  toPlan: string;
  changeType: string;
  amountPaid: number | null;
  effectiveAt: string;
  requestedAt: string;
  paymentStatus: string;
  paymentRef: string | null;
  note: string | null;
};

export type PaymentOrderInfo = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

export type RazorpayVerifyPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export async function fetchPlanInfo(): Promise<PlanInfo> {
  const res = await fetch(`${apiBase()}/api/plan/current`, { headers: authHeader() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to fetch plan info");
  }
  return res.json();
}

export async function upgradeImmediate(newPlan: PlanTier, paymentRef?: string): Promise<PlanInfo> {
  const res = await fetch(`${apiBase()}/api/plan/upgrade/immediate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ newPlan, paymentRef }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to upgrade plan");
  }
  return res.json();
}

export async function createPaymentOrder(newPlan: PlanTier): Promise<PaymentOrderInfo> {
  const res = await fetch(`${apiBase()}/api/payment/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ newPlan }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to create payment order");
  }
  return res.json();
}

export async function verifyPayment(
  payload: RazorpayVerifyPayload,
): Promise<{ success: boolean; plan: PlanTier; amountPaid: number }> {
  const res = await fetch(`${apiBase()}/api/payment/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to verify payment");
  }
  return res.json();
}

export async function scheduleRenewalChange(newPlan: PlanTier): Promise<void> {
  const res = await fetch(`${apiBase()}/api/plan/upgrade/renewal`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ newPlan }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to schedule plan change");
  }
}

export async function cancelRenewalChange(): Promise<void> {
  const res = await fetch(`${apiBase()}/api/plan/upgrade/renewal`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to cancel plan change");
  }
}

export async function fetchPlanHistory(): Promise<PlanChangeEntry[]> {
  const res = await fetch(`${apiBase()}/api/plan/history`, { headers: authHeader() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}
