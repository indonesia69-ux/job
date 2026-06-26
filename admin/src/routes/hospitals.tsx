import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminStore } from "@/lib/admin-store";
import { StatusBadge, VerifiedBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Briefcase,
  FileText,
  ChevronRight,
  ShieldCheck,
  Ban,
  Trash2,
  ArrowLeft,
  Eye,
  LogIn,
} from "lucide-react";
import { AdminEmptyState as EmptyState } from "@/components/common/EmptyState";
import { HospitalFlowBoard } from "@/components/HospitalFlowBoard";

export const Route = createFileRoute("/hospitals")({
  component: HospitalsPage,
});

function getRecruiterPortalUrl(): string | null {
  const configured = import.meta.env.VITE_RECRUITER_URL?.trim() || "";
  if (configured) return configured;
  if (import.meta.env.PROD) {
    console.error("VITE_RECRUITER_URL is required for production impersonation links.");
    return null;
  }
  return "http://localhost:8081";
}

type Level = "hospitals" | "recruiters" | "jobs" | "applicants";

function HospitalsPage() {
  const store = useAdminStore();
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [recruiterId, setRecruiterId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"standard" | "canvas">("standard");

  const level: Level = jobId
    ? "applicants"
    : recruiterId
      ? "jobs"
      : hospitalId
        ? "recruiters"
        : "hospitals";

  const hospital = store.hospitals.find((h) => h.id === hospitalId);
  const recruiter = store.recruiters.find((r) => r.id === recruiterId);
  const job = store.jobs.find((j) => j.id === jobId);

  return (
    <div className="space-y-6">
      {/* Header + breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hospital Hierarchy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drill from hospitals to recruiters, jobs, and candidate applications.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setViewMode("standard")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === "standard"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Standard View
          </button>
          <button
            onClick={() => setViewMode("canvas")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === "canvas"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Canvas View
          </button>
        </div>
      </div>

      {viewMode === "canvas" ? (
        <HospitalFlowBoard />
      ) : (
        <>
          <Breadcrumbs
            level={level}
            hospital={hospital?.name}
            recruiter={recruiter?.name}
            job={job?.title}
            onHospitals={() => {
              setHospitalId(null);
              setRecruiterId(null);
              setJobId(null);
            }}
            onRecruiters={() => {
              setRecruiterId(null);
              setJobId(null);
            }}
            onJobs={() => {
              setJobId(null);
            }}
          />

          {level === "hospitals" && <HospitalsList onOpen={(id) => setHospitalId(id)} />}
          {level === "recruiters" && hospital && (
            <RecruitersList
              hospitalId={hospital.id}
              onOpen={(id) => setRecruiterId(id)}
              onBack={() => setHospitalId(null)}
            />
          )}
          {level === "jobs" && hospital && recruiter && (
            <JobsList
              hospitalId={hospital.id}
              recruiterId={recruiter.id}
              onOpen={(id) => setJobId(id)}
              onBack={() => setRecruiterId(null)}
            />
          )}
          {level === "applicants" && job && (
            <ApplicantsList jobId={job.id} onBack={() => setJobId(null)} />
          )}
        </>
      )}
    </div>
  );
}

function Breadcrumbs({
  level,
  hospital,
  recruiter,
  job,
  onHospitals,
  onRecruiters,
  onJobs,
}: {
  level: Level;
  hospital?: string;
  recruiter?: string;
  job?: string;
  onHospitals: () => void;
  onRecruiters: () => void;
  onJobs: () => void;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <button
        onClick={onHospitals}
        className="font-medium hover:text-foreground inline-flex items-center gap-1"
      >
        <Building2 className="h-3.5 w-3.5" /> Hospitals
      </button>
      {hospital && (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <button
            onClick={onRecruiters}
            disabled={level === "recruiters"}
            className="font-medium hover:text-foreground disabled:text-foreground disabled:cursor-default"
          >
            {hospital}
          </button>
        </>
      )}
      {recruiter && (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <button
            onClick={onJobs}
            disabled={level === "jobs"}
            className="font-medium hover:text-foreground disabled:text-foreground disabled:cursor-default"
          >
            {recruiter}
          </button>
        </>
      )}
      {job && (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{job}</span>
        </>
      )}
    </nav>
  );
}

// ============= Hospitals list =============
function HospitalsList({ onOpen }: { onOpen: (id: string) => void }) {
  const store = useAdminStore();

  if (store.hospitals.length === 0 && !store.isLoading) {
    return (
      <EmptyState
        icon={Building2}
        lottieFile="nothing_for_the_particular_query.json"
        title="No approved hospitals"
        description="Hospitals will appear here once their onboarding application is approved."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {store.hospitals.map((h) => {
        const recCount = store.recruiters.filter((r) => r.hospitalId === h.id).length;
        const jobCount = store.jobs.filter((j) => j.hospitalId === h.id).length;
        return (
          <div key={h.id} className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-primary font-bold">
                  {h.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{h.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {h.location} · Joined {h.joined}
                  </p>
                </div>
              </div>
              <VerifiedBadge verified={h.verified} />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Recruiters" value={recCount} icon={<Users className="h-3.5 w-3.5" />} />
              <Stat label="Jobs" value={jobCount} icon={<Briefcase className="h-3.5 w-3.5" />} />
              <div className="rounded-lg border p-2">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <StatusBadge status={h.status} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onOpen(h.id)}
                className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Eye className="h-3.5 w-3.5" /> View Recruiters
              </button>
              <button
                onClick={async () => {
                  try {
                    if (h.verified) {
                      await store.unverifyHospital(h.id);
                      toast.success(`Verification revoked for ${h.name}.`);
                    } else {
                      await store.verifyHospital(h.id);
                      toast.success(`${h.name} has been verified.`);
                    }
                  } catch (err: any) {
                    toast.error(err?.message || "Action failed. Please try again.");
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-accent"
                title={h.verified ? "Revoke verification" : "Verify hospital"}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {h.verified ? "Revoke" : "Verify"}
              </button>
              <button
                onClick={async () => {
                  try {
                    await store.toggleHospitalBlock(h.id);
                    toast.success(
                      `Hospital ${h.status === "Active" ? "suspended" : "reactivated"}`,
                    );
                  } catch (err: any) {
                    toast.error(err?.message || "Action failed.");
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
                  h.status === "Active"
                    ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                    : "text-success border-success/30 hover:bg-success/10"
                }`}
                title={h.status === "Active" ? "Suspend hospital" : "Reactivate hospital"}
              >
                <Ban className="h-3.5 w-3.5" />
                {h.status === "Active" ? "Suspend" : "Reactivate"}
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Are you sure you want to delete this hospital?")) return;
                  try {
                    await store.deleteHospital(h.id);
                    toast.success("Hospital deleted.");
                  } catch (err: any) {
                    toast.error(err?.message || "Action failed.");
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-destructive border-destructive/20 hover:bg-destructive/10"
                title="Delete hospital"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-2">
      <p className="text-xs text-muted-foreground mb-1 inline-flex items-center justify-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

// ============= Recruiters list =============
function RecruitersList({
  hospitalId,
  onOpen,
  onBack,
}: {
  hospitalId: string;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  const store = useAdminStore();
  const hospital = store.hospitals.find((h) => h.id === hospitalId)!;
  const recs = store.recruiters.filter((r) => r.hospitalId === hospitalId);

  return (
    <div className="space-y-4">
      <BackBar onBack={onBack} label="Back to hospitals" />

      <div className="rounded-xl border bg-card shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{hospital.name}</p>
          <p className="text-xs text-muted-foreground">{hospital.location}</p>
        </div>
        <div className="flex items-center gap-4">
          {hospital.inviteCode && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Activation Code
              </span>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono font-bold text-primary">
                  {hospital.inviteCode}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hospital.inviteCode!);
                    alert("Activation code copied to clipboard!");
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Copy activation code"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 border-l pl-4 border-border">
            <VerifiedBadge verified={hospital.verified} />
            <StatusBadge status={hospital.status} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recruiter</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Verification
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jobs</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recs.map((r) => {
                const jobCount = store.jobs.filter((j) => j.recruiterId === r.id).length;
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.role}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-3">
                      <VerifiedBadge verified={store.isRecruiterVerified(r.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">{jobCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpen(r.id)}
                          className="rounded p-1.5 hover:bg-accent"
                          title="View jobs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Login as ${r.name}? This opens a 1-hour session.`))
                              return;
                            const recruiterUrl = getRecruiterPortalUrl();
                            if (!recruiterUrl) {
                              toast.error("Recruiter URL not configured");
                              return;
                            }
                            try {
                              const result = await store.impersonateUser(r.id);
                              const url = `${recruiterUrl}/impersonate?token=${encodeURIComponent(result.token)}`;
                              const popup = window.open(url, "_blank");
                              if (!popup) {
                                navigator.clipboard
                                  .writeText(url)
                                  .then(() =>
                                    toast.info(
                                      "Popup blocked — impersonation link copied to clipboard",
                                    ),
                                  );
                              } else {
                                toast.success(`Impersonating ${result.user.name}`);
                              }
                            } catch (err: any) {
                              toast.error(err?.message || "Failed to impersonate");
                            }
                          }}
                          className="rounded p-1.5 hover:bg-accent text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            getRecruiterPortalUrl()
                              ? "Login as recruiter"
                              : "Recruiter URL not configured"
                          }
                          disabled={!getRecruiterPortalUrl()}
                        >
                          <LogIn className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await store.toggleRecruiterBlock(r.id);
                              toast.success(
                                r.status === "Active"
                                  ? `${r.name} has been blocked.`
                                  : `${r.name} has been unblocked.`,
                              );
                            } catch (err: any) {
                              toast.error(err?.message || "Action failed. Please try again.");
                            }
                          }}
                          className={`rounded p-1.5 hover:bg-accent ${r.status === "Active" ? "text-destructive" : ""}`}
                          title={r.status === "Active" ? "Block recruiter" : "Unblock recruiter"}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {recs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10">
                    <EmptyState
                      icon={Users}
                      lottieFile="nothing_for_the_particular_query.json"
                      title="No recruiters"
                      description="No recruiters under this hospital yet."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============= Jobs list =============
function JobsList({
  hospitalId,
  recruiterId,
  onOpen,
  onBack,
}: {
  hospitalId: string;
  recruiterId: string;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  const store = useAdminStore();
  const recruiter = store.recruiters.find((r) => r.id === recruiterId)!;
  const list = store.jobs.filter((j) => j.hospitalId === hospitalId);

  return (
    <div className="space-y-4">
      <BackBar onBack={onBack} label="Back to recruiters" />

      <div className="rounded-xl border bg-card shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{recruiter.name}</p>
          <p className="text-xs text-muted-foreground">
            {recruiter.email} · {recruiter.role} · Jobs posted at this hospital
          </p>
        </div>
        <VerifiedBadge verified={store.isRecruiterVerified(recruiter.id)} />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Job Title</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Applicants
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Posted</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((j) => {
                const apps = store.applications.filter((a) => a.jobId === j.id).length;
                return (
                  <tr key={j.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{j.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{j.location}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="px-4 py-3">{apps}</td>
                    <td className="px-4 py-3 text-muted-foreground">{j.posted}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpen(j.id)}
                          className="rounded p-1.5 hover:bg-accent"
                          title="View applicants"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete job "${j.title}"?`)) store.deleteJob(j.id);
                          }}
                          className="rounded p-1.5 hover:bg-accent text-destructive"
                          title="Delete job"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <EmptyState
                      icon={Briefcase}
                      lottieFile="nothing_for_the_particular_query.json"
                      title="No jobs"
                      description="This recruiter has not posted any jobs yet."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============= Applicants list =============
function ApplicantsList({ jobId, onBack }: { jobId: string; onBack: () => void }) {
  const store = useAdminStore();
  const job = store.jobs.find((j) => j.id === jobId)!;
  const apps = store.applications.filter((a) => a.jobId === jobId);

  return (
    <div className="space-y-4">
      <BackBar onBack={onBack} label="Back to jobs" />

      <div className="rounded-xl border bg-card shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold inline-flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {job.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {job.location} · Posted {job.posted}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Candidate</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Specialty</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Application
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Verified</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Applied</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => {
                const c = store.candidates.find((x) => x.id === a.candidateId);
                if (!c) return null;
                return (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.role}</td>
                    <td className="px-4 py-3">{c.specialty}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      <VerifiedBadge verified={c.verified} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.applied}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => store.toggleCandidateBlock(c.id)}
                        className={`inline-flex items-center gap-1 rounded p-1.5 hover:bg-accent ${c.status === "Active" ? "text-destructive" : ""}`}
                        title={c.status === "Active" ? "Block candidate" : "Unblock candidate"}
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {apps.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10">
                    <EmptyState
                      icon={FileText}
                      lottieFile="nothing_for_the_particular_query.json"
                      title="No applications"
                      description="No applications received yet."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BackBar({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <button
      onClick={onBack}
      className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
