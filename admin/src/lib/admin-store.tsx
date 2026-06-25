import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from "react";
import { apiBase, authHeader, apiFetch } from "./api";
import { useAuth } from "./auth-context";

// ============= Types =============
export type EntityStatus = "Active" | "Suspended";

export interface Hospital {
  id: string;
  name: string;
  location: string;
  verified: boolean;
  status: EntityStatus;
  joined: string;
  inviteCode?: string;
  plan?: PlanTier;
}

export interface Recruiter {
  id: string;
  name: string;
  email: string;
  role: string;
  hospitalId: string;
  status: EntityStatus;
  joined: string;
}

export interface Job {
  id: string;
  title: string;
  hospitalId: string;
  recruiterId: string;
  location: string;
  status: "Active" | "Closed" | "Draft";
  isFlagged?: boolean;
  posted: string;
}

export interface Candidate {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: string;
  specialty: string;
  experience: string;
  location?: string;
  verified: boolean;
  status: EntityStatus;
  joined: string;
  cvUrl?: string;
  uploadedCvName?: string;
  uploadedCvData?: string;
  cvSource?: string;
  supportingDocuments?: any[];
  isSuspended?: boolean;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: string;
  applied: string;
  candidate?: string;
  job?: string;
  hospital?: string;
  cvUrl?: string;
  isFlagged?: boolean;
  uploadedCvName?: string;
  uploadedCvData?: string;
}

export type PlanTier = "Basic" | "Pro" | "Premium";
export type RecruiterApplicationStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "RequestMoreDocuments";

export interface RecruiterApplication {
  id: string;
  hospitalName: string;
  brandName?: string;
  hospitalType: string;
  registrationNumber: string;
  registrationAuthority?: string;
  nabhStatus?: string;
  nablStatus?: string;
  gstNumber?: string;
  panNumber?: string;
  ownershipType?: string;
  city: string;
  state: string;
  district?: string;
  pinCode?: string;
  beds: number;
  icuBeds?: number;
  numberOfDoctors?: number;
  numberOfEmployees?: number;
  averageMonthlyHiring?: number;
  preferredHiringStates?: string;
  emergencyHiringRequirement?: boolean;
  internshipHiring?: boolean;
  campusRecruitment?: boolean;
  address: string;
  website: string;
  founded?: number;
  about?: string;
  phone: string;
  email: string;
  contactName?: string;
  contactDesignation?: string;
  contactWhatsapp?: string;
  contactAlternatePhone?: string;
  billingName?: string;
  billingGstNumber?: string;
  billingAddress?: string;
  billingEmail?: string;
  billingPhone?: string;
  plan: PlanTier;
  status: RecruiterApplicationStatus;
  submitted: string;
  inviteCode?: string; // Set after admin approval
  requestedDocuments?: string; // Set when admin requests more docs
}

interface AdminStoreValue {
  hospitals: Hospital[];
  recruiters: Recruiter[];
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  recruiterApplications: RecruiterApplication[];
  // Hospital actions
  verifyHospital: (id: string) => Promise<void>;
  unverifyHospital: (id: string) => Promise<void>;
  toggleHospitalBlock: (id: string) => Promise<void>;
  deleteHospital: (id: string) => Promise<void>;
  // Recruiter actions
  toggleRecruiterBlock: (id: string) => Promise<void>;
  resetRecruiterPassword: (
    id: string,
    mode: "generate" | "custom",
    newPassword?: string,
  ) => Promise<{ temporaryPassword?: string }>;
  deleteRecruiter: (id: string) => Promise<void>;
  // Candidate actions
  toggleCandidateBlock: (id: string) => Promise<void>;
  verifyCandidate: (id: string) => Promise<void>;
  unverifyCandidate: (id: string) => Promise<void>;
  deleteCandidate: (id: string) => Promise<void>;
  // Job actions
  updateJobStatus: (id: string, status: string) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  toggleJobFlag: (id: string) => Promise<void>;
  // Application actions
  updateApplicationStatus: (id: string, status: string) => Promise<void>;
  toggleApplicationFlag: (id: string) => Promise<void>;
  // Recruiter application actions
  submitRecruiterApplication: (
    data: Omit<RecruiterApplication, "id" | "status" | "submitted">,
  ) => Promise<void>;
  approveRecruiterApplication: (id: string) => Promise<void>;
  rejectRecruiterApplication: (id: string, reason: string) => Promise<void>;
  requestMoreDocuments: (id: string, requestedDocuments: string) => Promise<void>;
  // Subscriptions & Impersonation
  fetchSubscriptions: () => Promise<void>;
  suspendSubscription: (hospitalId: string) => Promise<void>;
  reactivateSubscription: (hospitalId: string) => Promise<void>;
  overrideHospitalPlan: (
    hospitalId: string,
    plan: string,
    expiresAt?: string,
    note?: string,
  ) => Promise<void>;
  impersonateUser: (userId: string) => Promise<{ token: string; user: any }>;
  // Helpers
  isRecruiterVerified: (recruiterId: string) => boolean;
  refreshAll: () => Promise<void>;
  isLoading: boolean;

  // Real stats
  stats: any;
  logs: any[];
}

const AdminStore = createContext<AdminStoreValue | null>(null);

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [recruiterApplications, setRecruiterApplications] = useState<RecruiterApplication[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshAll = async () => {
    setIsLoading(true);
    try {
      const headers = authHeader();

      // Fetch hospitals & onboarding apps
      const hospRes = await apiFetch(`${apiBase()}/api/admin/hospitals`, { headers });
      if (hospRes.ok) {
        const { data: rawData } = await hospRes.json();

        // Split into verified hospitals and pending onboarding apps
        const validHospitals = rawData
          .filter((h: any) => h.onboardingStatus === "Approved")
          .map((h: any) => ({
            id: h.id,
            name: h.name,
            location: `${h.city || ""}, ${h.state || ""}`.replace(/^, /, ""),
            verified: h.verified,
            status: h.isSuspended ? "Suspended" : "Active",
            joined: h.approvedAt ? new Date(h.approvedAt).toISOString().slice(0, 10) : "",
            inviteCode: h.inviteCode || undefined,
          }));

        // Show Pending, Approved (to see invite codes) and RequestMoreDocuments
        const apps = rawData
          .filter(
            (h: any) =>
              h.onboardingStatus === "Pending" ||
              h.onboardingStatus === "Approved" ||
              h.onboardingStatus === "RequestMoreDocuments",
          )
          .map((h: any) => ({
            id: h.id,
            hospitalName: h.name,
            brandName: h.brandName || "",
            hospitalType: h.type || "",
            registrationNumber: h.registrationNumber || "",
            registrationAuthority: h.registrationAuthority || "",
            nabhStatus: h.nabhStatus || "",
            nablStatus: h.nablStatus || "",
            gstNumber: h.gstNumber || "",
            panNumber: h.panNumber || "",
            ownershipType: h.ownershipType || "",
            city: h.city || "",
            state: h.state || "",
            district: h.district || "",
            pinCode: h.pinCode || "",
            beds: h.beds || 0,
            icuBeds: h.icuBeds || 0,
            numberOfDoctors: h.numberOfDoctors || 0,
            numberOfEmployees: h.numberOfEmployees || 0,
            averageMonthlyHiring: h.averageMonthlyHiring || 0,
            preferredHiringStates: h.preferredHiringStates || "",
            emergencyHiringRequirement: h.emergencyHiringRequirement || false,
            internshipHiring: h.internshipHiring || false,
            campusRecruitment: h.campusRecruitment || false,
            address: h.address || "",
            website: h.website || "",
            founded: h.founded || 0,
            about: h.about || "",
            phone: h.phone || h.submittedPhone || "",
            email: h.email || h.submittedEmail || "",
            contactName: h.submittedBy || "",
            contactDesignation: h.contactDesignation || "",
            contactWhatsapp: h.contactWhatsapp || "",
            contactAlternatePhone: h.contactAlternatePhone || "",
            billingName: h.billingName || "",
            billingGstNumber: h.billingGstNumber || "",
            billingAddress: h.billingAddress || "",
            billingEmail: h.billingEmail || "",
            billingPhone: h.billingPhone || "",
            plan: h.onboardingPlan as PlanTier,
            status: h.onboardingStatus,
            submitted: h.submittedAt ? new Date(h.submittedAt).toISOString().slice(0, 10) : "",
            inviteCode: h.inviteCode || undefined,
            requestedDocuments: h.requestedDocuments || undefined,
          }));

        setHospitals(validHospitals);
        setRecruiterApplications(apps);
      }

      // Fetch recruiters
      const recRes = await apiFetch(`${apiBase()}/api/admin/recruiters`, { headers });
      if (recRes.ok) {
        const { data } = await recRes.json();
        setRecruiters(
          data.map((r: any) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            role: "HR Recruiter", // Simplify for now
            hospitalId: r.hospitalId,
            status: r.isSuspended ? "Suspended" : "Active",
            joined: new Date(r.createdAt).toISOString().slice(0, 10),
          })),
        );
      }

      // Fetch candidates
      const candRes = await apiFetch(`${apiBase()}/api/admin/candidates`, { headers });
      if (candRes.ok) {
        const { data } = await candRes.json();
        setCandidates(
          data.map((c: any) => ({
            id: c.id,
            userId: c.userId,
            name: c.name,
            email: c.email || "",
            role: c.role || "",
            specialty: c.specialty || "",
            experience: `${c.experienceYears || 0} years`,
            location: c.location || c.city || "",
            verified: c.verified,
            status: c.isSuspended ? "Suspended" : "Active",
            isSuspended: c.isSuspended || false,
            joined: c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : "N/A",
            cvUrl: c.cvUrl,
            uploadedCvName: c.uploadedCvName,
            uploadedCvData: c.uploadedCvData,
            cvSource: c.cvSource,
            supportingDocuments:
              typeof c.supportingDocuments === "string"
                ? JSON.parse(c.supportingDocuments || "[]")
                : c.supportingDocuments || [],
          })),
        );
      }

      // Fetch stats
      const statsRes = await apiFetch(`${apiBase()}/api/admin/stats`, { headers });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // Fetch logs
      const logsRes = await apiFetch(`${apiBase()}/api/admin/logs`, { headers });
      if (logsRes.ok) {
        const { data } = await logsRes.json();
        setLogs(data ?? []);
      }

      // Fetch jobs
      const jobsRes = await apiFetch(`${apiBase()}/api/admin/jobs`, { headers });
      if (jobsRes.ok) {
        const { data } = await jobsRes.json();
        setJobs(data);
      }

      // Fetch applications
      const appRes = await apiFetch(`${apiBase()}/api/admin/applications`, { headers });
      if (appRes.ok) {
        const payload = await appRes.json();
        const data = Array.isArray(payload) ? payload : payload.data || [];
        setApplications(
          data.map((a: any) => ({
            id: a.id,
            jobId: a.jobId,
            candidateId: a.candidateId,
            status: a.status,
            applied: new Date(a.appliedOn).toISOString().slice(0, 10),
            candidate: a.candidate?.name || "Unknown",
            job: a.job?.role || "Unknown",
            hospital: a.job?.hospital?.name || "Unknown",
            cvUrl: a.cvUrl || a.candidate?.cvUrl,
            isFlagged: a.isFlagged || false,
            uploadedCvName: a.candidate?.uploadedCvName,
            uploadedCvData: a.candidate?.uploadedCvData,
          })),
        );
      }
    } catch (e) {
      console.error("Failed to load admin data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      refreshAll();
    }
  }, [isAuthenticated]);

  const verifiedHospitalIds = useMemo(
    () => new Set(hospitals.filter((h) => h.verified).map((h) => h.id)),
    [hospitals],
  );

  const value: AdminStoreValue = {
    hospitals,
    recruiters,
    jobs,
    candidates,
    applications,
    recruiterApplications,
    isLoading,
    refreshAll,
    stats,
    logs,

    verifyHospital: async (id) => {
      const res = await apiFetch(`${apiBase()}/api/admin/hospitals/${id}/verify`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Failed to verify hospital");
      await refreshAll();
    },
    unverifyHospital: async (id) => {
      const res = await apiFetch(`${apiBase()}/api/admin/hospitals/${id}/unverify`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Failed to unverify hospital");
      await refreshAll();
    },
    toggleHospitalBlock: async (id) => {
      const hospital = hospitals.find((h) => h.id === id);
      if (!hospital) return;
      const endpoint = hospital.status === "Active" ? "suspend" : "reactivate";
      const res = await apiFetch(`${apiBase()}/api/admin/hospitals/${id}/${endpoint}`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error(`Failed to ${endpoint} hospital`);
      await refreshAll();
    },
    deleteHospital: async (id) => {
      const res = await apiFetch(`${apiBase()}/api/admin/hospitals/${id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Failed to delete hospital");
      await refreshAll();
    },
    toggleRecruiterBlock: async (id) => {
      const recruiter = recruiters.find((r) => r.id === id);
      if (!recruiter) return;
      const endpoint = recruiter.status === "Active" ? "suspend" : "reactivate";
      const res = await apiFetch(`${apiBase()}/api/admin/recruiters/${id}/${endpoint}`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error(`Failed to ${endpoint} recruiter`);
      await refreshAll();
    },
    resetRecruiterPassword: async (id, mode, newPassword) => {
      const res = await apiFetch(`${apiBase()}/api/admin/recruiters/${id}/reset-password`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ mode, newPassword }),
      });
      if (!res.ok) throw new Error("Failed to reset recruiter password");
      return await res.json();
    },
    deleteRecruiter: async (id) => {
      const res = await apiFetch(`${apiBase()}/api/admin/recruiters/${id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Failed to delete recruiter");
      await refreshAll();
    },
    toggleCandidateBlock: async (id) => {
      const candidate = candidates.find((c) => c.id === id);
      if (!candidate) return;
      const endpoint = candidate.status === "Active" ? "suspend" : "reactivate";
      const res = await apiFetch(`${apiBase()}/api/admin/candidates/${id}/${endpoint}`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error(`Failed to ${endpoint} candidate`);
      await refreshAll();
    },
    verifyCandidate: async (id) => {
      const res = await apiFetch(`${apiBase()}/api/admin/candidates/${id}/verify`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Failed to verify candidate");
      await refreshAll();
    },
    unverifyCandidate: async (id) => {
      const res = await apiFetch(`${apiBase()}/api/admin/candidates/${id}/unverify`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Failed to unverify candidate");
      await refreshAll();
    },
    deleteCandidate: async (id) => {
      const res = await apiFetch(`${apiBase()}/api/admin/candidates/${id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Failed to delete candidate");
      await refreshAll();
    },
    updateJobStatus: async (id, status) => {
      const res = await apiFetch(`${apiBase()}/api/admin/jobs/${id}/status`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update job status");
      await refreshAll();
    },
    deleteJob: async (id) => {
      const res = await apiFetch(`${apiBase()}/api/admin/jobs/${id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Failed to delete job");
      await refreshAll();
    },
    toggleJobFlag: async (id) => {
      // Optimistic update — flip immediately so UI responds instantly
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, isFlagged: !j.isFlagged } : j)));
      const res = await apiFetch(`${apiBase()}/api/admin/jobs/${id}/flag`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (!res.ok) {
        // Revert on failure
        setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, isFlagged: !j.isFlagged } : j)));
        throw new Error("Failed to flag job");
      }
    },
    updateApplicationStatus: async (id, status) => {
      const res = await apiFetch(`${apiBase()}/api/admin/applications/${id}/status`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update application status");
      await refreshAll();
    },
    toggleApplicationFlag: async (id) => {
      // Optimistic update — flip immediately so the UI responds instantly
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isFlagged: !a.isFlagged } : a)),
      );
      const res = await apiFetch(`${apiBase()}/api/admin/applications/${id}/flag`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (!res.ok) {
        // Revert optimistic update on failure
        setApplications((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isFlagged: !a.isFlagged } : a)),
        );
        throw new Error("Failed to flag application");
      }
      // Skip refreshAll() — optimistic update already reflects the change
    },

    // Wire up to POST /api/onboarding/hospitals
    submitRecruiterApplication: async (data) => {
      const res = await apiFetch(`${apiBase()}/api/onboarding/hospitals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.hospitalName,
          email: data.email,
          phone: data.phone,
          plan: data.plan,
          type: data.hospitalType,
          city: data.city,
          state: data.state,
          address: data.address,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit onboarding application");
      }
      refreshAll();
    },

    approveRecruiterApplication: async (id) => {
      const res = await apiFetch(`${apiBase()}/api/admin/hospitals/${id}/approve`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "Failed to approve hospital");
      }
      refreshAll();
    },

    rejectRecruiterApplication: async (id, reason) => {
      const res = await apiFetch(`${apiBase()}/api/admin/hospitals/${id}/reject`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed to reject hospital");
      refreshAll();
    },

    requestMoreDocuments: async (id, requestedDocuments) => {
      const res = await apiFetch(`${apiBase()}/api/admin/hospitals/${id}/request-more-documents`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ requestedDocuments }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "Failed to request more documents");
      }
      refreshAll();
    },

    isRecruiterVerified: (recruiterId) => {
      const r = recruiters.find((x) => x.id === recruiterId);
      return r ? verifiedHospitalIds.has(r.hospitalId) : false;
    },

    overrideHospitalPlan: async (hospitalId, plan, expiresAt, note) => {
      const res = await apiFetch(`${apiBase()}/api/admin/hospitals/${hospitalId}/plan`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingPlan: plan, planExpiresAt: expiresAt, note }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "Failed to override hospital plan");
      }
      await refreshAll();
    },

    impersonateUser: async (userId) => {
      const res = await apiFetch(`${apiBase()}/api/admin/impersonate/${userId}`, {
        method: "POST",
        headers: authHeader(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "Failed to impersonate user");
      }
      return await res.json();
    },

    fetchSubscriptions: async () => {
      /* handled by subscriptions.tsx directly */
    },
    suspendSubscription: async (hospitalId) => {
      const res = await apiFetch(`${apiBase()}/api/admin/subscriptions/${hospitalId}/suspend`, {
        method: "POST",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Failed to suspend subscription");
      await refreshAll();
    },
    reactivateSubscription: async (hospitalId) => {
      const res = await apiFetch(`${apiBase()}/api/admin/subscriptions/${hospitalId}/reactivate`, {
        method: "POST",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Failed to reactivate subscription");
      await refreshAll();
    },
  };

  return <AdminStore.Provider value={value}>{children}</AdminStore.Provider>;
}

export function useAdminStore() {
  const ctx = useContext(AdminStore);
  if (!ctx) throw new Error("useAdminStore must be used within AdminStoreProvider");
  return ctx;
}
