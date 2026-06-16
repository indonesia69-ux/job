import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useAdminStore } from "@/lib/admin-store";
import { StatusBadge, VerifiedBadge } from "@/components/StatusBadge";
import { AdminEmptyState as EmptyState } from "@/components/common/EmptyState";
import { toast } from "sonner";
import {
  Building2,
  ArrowLeft,
  Eye,
  Trash2,
  Ban,
  CheckCircle,
  User,
  Users,
  Loader2,
  ClipboardList,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/jobs_/$id")({
  component: JobDetailsPage,
});

const APP_STATUSES = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Interview Scheduled",
  "Offer Sent",
  "Hired",
  "Rejected",
];

function JobDetailsPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const store = useAdminStore();

  const job = store.jobs.find((j) => j.id === id);
  const hospital = store.hospitals.find((h) => h.id === job?.hospitalId);
  const recruiter = store.recruiters.find((r) => r.id === job?.recruiterId);
  const applications = store.applications.filter((a) => a.jobId === id);

  // Loading guard — store data may not be populated yet on direct URL navigation
  if (store.isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-4">
        <p className="text-muted-foreground text-lg">Job not found.</p>
        <button
          onClick={() => router.history.back()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  // Derived stats
  const hired = applications.filter((a) => a.status === "Hired").length;
  const shortlisted = applications.filter((a) => a.status === "Shortlisted").length;
  const pending = applications.filter(
    (a) => a.status === "Applied" || a.status === "Under Review",
  ).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => router.history.back()}
          className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span>/</span>
        <Link to="/jobs" className="hover:text-foreground transition-colors">
          Jobs
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground max-w-[200px] truncate">{job.title}</span>
      </nav>

      {/* Job Header Card */}
      <div className="rounded-xl border bg-card shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-2xl">
              <BriefcaseIcon />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-muted-foreground text-sm">
                <span>{job.location}</span>
                <span>•</span>
                <span>Posted {job.posted}</span>
                {hospital && (
                  <>
                    <span>•</span>
                    <Link
                      to="/hospitals"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      {hospital.name}
                    </Link>
                  </>
                )}
                {recruiter && (
                  <>
                    <span>•</span>
                    <Link
                      to="/recruiters/$id"
                      params={{ id: recruiter.id }}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <User className="h-3.5 w-3.5" />
                      {recruiter.name}
                    </Link>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <StatusBadge status={job.status} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () => {
                try {
                  const newStatus = (job.status as string) === "Suspended" ? "Active" : "Suspended";
                  await store.updateJobStatus(job.id, newStatus);
                  toast.success(`Job ${newStatus === "Active" ? "reactivated" : "suspended"}`);
                } catch (e: any) {
                  toast.error(e.message || "Failed to update job");
                }
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                job.status === "Active"
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "bg-success/10 text-success hover:bg-success/20"
              }`}
            >
              {job.status === "Active" ? (
                <Ban className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {job.status === "Active" ? "Suspend Job" : "Reactivate Job"}
            </button>
            <button
              onClick={async () => {
                if (confirm(`Delete job "${job.title}"?`)) {
                  try {
                    await store.deleteJob(job.id);
                    toast.success("Job deleted");
                    router.history.back();
                  } catch (e: any) {
                    toast.error(e.message || "Failed to delete job");
                  }
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-destructive/20 bg-card px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Applicants",
            value: applications.length,
            icon: <Users className="h-4 w-4" />,
          },
          {
            label: "Pending Review",
            value: pending,
            icon: <ClipboardList className="h-4 w-4" />,
          },
          {
            label: "Shortlisted",
            value: shortlisted,
            icon: <UserCheck className="h-4 w-4" />,
          },
          { label: "Hired", value: hired, icon: <CheckCircle className="h-4 w-4" /> },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card shadow-sm p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {stat.icon}
              <span className="text-xs font-medium">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Applicants List */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold">Applicants</h2>
          <p className="text-sm text-muted-foreground">
            All candidates who have applied to this position.
          </p>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Candidate Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Role / Specialty
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Applied Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    App Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Account Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const candidate = store.candidates.find((c) => c.id === app.candidateId);
                  if (!candidate) return null;
                  return (
                    <tr
                      key={app.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        <Link
                          to="/candidates/$id"
                          params={{ id: candidate.id }}
                          className="hover:underline hover:text-primary flex items-center gap-2"
                        >
                          {candidate.name}
                          {candidate.verified && <VerifiedBadge verified={true} />}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {candidate.role} · {candidate.specialty}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{app.applied}</td>
                      <td className="px-4 py-3">
                        {/* Editable application status dropdown */}
                        <select
                          value={app.status}
                          onChange={async (e) => {
                            try {
                              await store.updateApplicationStatus(app.id, e.target.value);
                              toast.success(`Status updated to "${e.target.value}"`);
                            } catch (err: any) {
                              toast.error(err.message || "Failed to update status");
                            }
                          }}
                          className="rounded-md border bg-card px-2 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                        >
                          {APP_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                          {/* Keep current value even if not in preset list */}
                          {!APP_STATUSES.includes(app.status) && (
                            <option value={app.status}>{app.status}</option>
                          )}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={candidate.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            to="/candidates/$id"
                            params={{ id: candidate.id }}
                            className="rounded p-1.5 hover:bg-accent inline-flex"
                            title="View Candidate Profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={async () => {
                              try {
                                await store.toggleCandidateBlock(candidate.id);
                                toast.success(
                                  `Candidate ${candidate.status === "Active" ? "suspended" : "reactivated"}`,
                                );
                              } catch (e: any) {
                                toast.error(e.message || "Failed to update candidate");
                              }
                            }}
                            className={`inline-flex items-center gap-1 rounded p-1.5 hover:bg-accent ${candidate.status === "Active" ? "text-destructive" : "text-success"}`}
                            title={
                              candidate.status === "Active"
                                ? "Block candidate"
                                : "Unblock candidate"
                            }
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {applications.length === 0 && (
            <div className="p-8">
              <EmptyState
                icon={Users}
                lottieFile="nothing_for_the_particular_query.json"
                title="No Applications"
                description="There are no applicants for this job yet."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BriefcaseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
