import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from "react";
import { apiBase, authHeader } from "./api";
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
  posted: string;
}

export interface Candidate {
  id: string;
  name: string;
  role: string;
  specialty: string;
  experience: string;
  verified: boolean;
  status: EntityStatus;
  joined: string;
  cvUrl?: string;
  uploadedCvName?: string;
  uploadedCvData?: string;
  cvSource?: string;
  supportingDocuments?: any[];
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: "Under Review" | "Shortlisted" | "Accepted" | "Rejected";
  applied: string;
  candidate?: string;
  job?: string;
  hospital?: string;
  cvUrl?: string;
}

export type PlanTier = "Basic" | "Pro" | "Premium";
export type RecruiterApplicationStatus = "Pending" | "Approved" | "Rejected" | "RequestMoreDocuments";

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
  inviteCode?: string;           // Set after admin approval
  requestedDocuments?: string;   // Set when admin requests more docs
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
  // Recruiter actions
  toggleRecruiterBlock: (id: string) => Promise<void>;
  // Candidate actions
  toggleCandidateBlock: (id: string) => Promise<void>;
  verifyCandidate: (id: string) => Promise<void>;
  // Job actions
  deleteJob: (id: string) => Promise<void>;
  // Recruiter application actions
  submitRecruiterApplication: (
    data: Omit<RecruiterApplication, "id" | "status" | "submitted">,
  ) => Promise<void>;
  approveRecruiterApplication: (id: string) => Promise<void>;
  rejectRecruiterApplication: (id: string, reason: string) => Promise<void>;
  requestMoreDocuments: (id: string, requestedDocuments: string) => Promise<void>;
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
      const hospRes = await fetch(`${apiBase()}/api/admin/hospitals`, { headers });
      if (hospRes.ok) {
        const { data: rawData } = await hospRes.json();
        
        // Split into verified hospitals and pending onboarding apps
        const validHospitals = rawData.filter((h: any) => h.onboardingStatus === 'Approved').map((h: any) => ({
          id: h.id,
          name: h.name,
          location: `${h.city || ''}, ${h.state || ''}`.replace(/^, /, ''),
          verified: h.verified,
          status: "Active", // TODO: Add status field to DB later if needed
          joined: h.approvedAt ? new Date(h.approvedAt).toISOString().slice(0, 10) : "",
          inviteCode: h.inviteCode || undefined,
        }));

        // Show Pending, Approved (to see invite codes) and RequestMoreDocuments
        const apps = rawData.filter((h: any) =>
          h.onboardingStatus === 'Pending' ||
          h.onboardingStatus === 'Approved' ||
          h.onboardingStatus === 'RequestMoreDocuments'
        ).map((h: any) => ({
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
      const recRes = await fetch(`${apiBase()}/api/admin/recruiters`, { headers });
      if (recRes.ok) {
        const { data } = await recRes.json();
        setRecruiters(data.map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          role: "HR Recruiter", // Simplify for now
          hospitalId: r.hospitalId,
          status: "Active",
          joined: new Date(r.createdAt).toISOString().slice(0, 10),
        })));
      }

      // Fetch candidates
      const candRes = await fetch(`${apiBase()}/api/admin/candidates`, { headers });
      if (candRes.ok) {
        const { data } = await candRes.json();
        setCandidates(data.map((c: any) => ({
          id: c.id,
          name: c.name,
          role: c.role || "",
          specialty: c.specialty || "",
          experience: `${c.experienceYears || 0} years`,
          verified: c.verified,
          status: "Active",
          joined: c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : "N/A",
          cvUrl: c.cvUrl,
          uploadedCvName: c.uploadedCvName,
          uploadedCvData: c.uploadedCvData,
          cvSource: c.cvSource,
          supportingDocuments: typeof c.supportingDocuments === 'string' 
            ? JSON.parse(c.supportingDocuments || "[]") 
            : (c.supportingDocuments || []),
        })));
      }

      // Fetch stats
      const statsRes = await fetch(`${apiBase()}/api/admin/stats`, { headers });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // Fetch logs
      const logsRes = await fetch(`${apiBase()}/api/admin/logs`, { headers });
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }

      // Fetch jobs
      const jobsRes = await fetch(`${apiBase()}/api/admin/jobs`, { headers });
      if (jobsRes.ok) {
        const { data } = await jobsRes.json();
        setJobs(data);
      }

      // Fetch applications
      const appRes = await fetch(`${apiBase()}/api/admin/applications`, { headers });
      if (appRes.ok) {
        const data = await appRes.json();
        setApplications(data.map((a: any) => ({
          id: a.id,
          jobId: a.jobId,
          candidateId: a.candidateId,
          status: a.status,
          applied: new Date(a.appliedAt).toISOString().slice(0, 10),
          candidate: a.candidate?.name || "Unknown",
          job: a.job?.role || "Unknown",
          hospital: a.job?.hospital?.name || "Unknown",
          cvUrl: a.cvUrl || a.candidate?.cvUrl,
        })));
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
      // Stub
      setHospitals((prev) => prev.map((h) => (h.id === id ? { ...h, verified: true } : h)));
    },
    unverifyHospital: async (id) => {
      // Stub
      setHospitals((prev) => prev.map((h) => (h.id === id ? { ...h, verified: false } : h)));
    },
    toggleHospitalBlock: async (id) => {
      setHospitals((prev) =>
        prev.map((h) =>
          h.id === id ? { ...h, status: h.status === "Active" ? "Suspended" : "Active" } : h,
        ),
      );
    },
    toggleRecruiterBlock: async (id) => {
      setRecruiters((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: r.status === "Active" ? "Suspended" : "Active" } : r,
        ),
      );
    },
    toggleCandidateBlock: async (id) => {
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: c.status === "Active" ? "Suspended" : "Active" } : c,
        ),
      );
    },
    verifyCandidate: async (id) => {
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, verified: true } : c)));
    },
    deleteJob: async (id) => {
      setJobs((prev) => prev.filter((j) => j.id !== id));
      setApplications((prev) => prev.filter((a) => a.jobId !== id));
    },
    
    // Wire up to POST /api/onboarding/hospitals
    submitRecruiterApplication: async (data) => {
      const res = await fetch(`${apiBase()}/api/onboarding/hospitals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.hospitalName,
          email: data.email,
          phone: data.phone,
          plan: data.plan,
          type: data.hospitalType,
          city: data.city,
          state: data.state
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit onboarding application");
      }
      refreshAll();
    },

    approveRecruiterApplication: async (id) => {
      const res = await fetch(`${apiBase()}/api/admin/hospitals/${id}/approve`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Failed to approve hospital");
      refreshAll();
    },

    rejectRecruiterApplication: async (id, reason) => {
      const res = await fetch(`${apiBase()}/api/admin/hospitals/${id}/reject`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) throw new Error("Failed to reject hospital");
      refreshAll();
    },

    requestMoreDocuments: async (id, requestedDocuments) => {
      const res = await fetch(`${apiBase()}/api/admin/hospitals/${id}/request-more-documents`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ requestedDocuments })
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
  };

  return <AdminStore.Provider value={value}>{children}</AdminStore.Provider>;
}

export function useAdminStore() {
  const ctx = useContext(AdminStore);
  if (!ctx) throw new Error("useAdminStore must be used within AdminStoreProvider");
  return ctx;
}
