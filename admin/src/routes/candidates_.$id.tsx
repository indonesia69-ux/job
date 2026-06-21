import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useAdminStore } from "@/lib/admin-store";
import { StatusBadge, VerifiedBadge } from "@/components/StatusBadge";
import { AdminEmptyState as EmptyState } from "@/components/common/EmptyState";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Eye,
  Trash2,
  Ban,
  CheckCircle,
  Building2,
  Mail,
  MapPin,
  Stethoscope,
  LogIn,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/candidates_/$id")({
  component: CandidateDetailsPage,
});

function getCandidatePortalUrl(): string | null {
  const configured = import.meta.env.VITE_CANDIDATE_URL?.trim() || "";
  if (configured) return configured;
  if (import.meta.env.PROD) {
    console.error("VITE_CANDIDATE_URL is required for production impersonation links.");
    return null;
  }
  return "http://localhost:5173";
}

function CandidateDetailsPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const store = useAdminStore();

  const candidate = store.candidates.find((c) => c.id === id);
  const applications = store.applications.filter((a) => a.candidateId === id);

  // Loading guard — store data may not be populated yet on direct URL navigation
  if (store.isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-4">
        <p className="text-muted-foreground text-lg">Candidate not found.</p>
        <button
          onClick={() => router.history.back()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  const hasCv = !!(candidate.cvUrl || candidate.uploadedCvData);
  const hasDocuments = candidate.supportingDocuments && candidate.supportingDocuments.length > 0;

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
        <Link to="/candidates" className="hover:text-foreground transition-colors">
          Candidates
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">{candidate.name}</span>
      </nav>

      {/* Candidate Header Card */}
      <div className="rounded-xl border bg-card shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-3xl">
              {candidate.name[0]}
            </div>
            <div className="space-y-3">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {candidate.name}
                  {candidate.verified && <VerifiedBadge verified={true} />}
                </h1>
                <p className="text-muted-foreground font-medium mt-1">
                  {candidate.role} {candidate.specialty && `• ${candidate.specialty}`}
                </p>
              </div>

              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> {candidate.email}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {candidate.location || "Location not provided"}
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />{" "}
                  {candidate.experience
                    ? `${candidate.experience} experience`
                    : "Experience not specified"}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <StatusBadge status={candidate.status} />
                <span className="text-xs text-muted-foreground ml-2">
                  Joined {candidate.joined}
                </span>
                {!candidate.cvSource && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                    Incomplete Profile
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0 min-w-[180px]">
            <button
              onClick={async () => {
                try {
                  await store.toggleCandidateBlock(candidate.id);
                  toast.success(
                    `Candidate ${candidate.status === "Active" ? "suspended" : "reactivated"}`,
                  );
                } catch (e: any) {
                  toast.error(e.message || "Failed to toggle status");
                }
              }}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                candidate.status === "Active"
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "bg-success/10 text-success hover:bg-success/20"
              }`}
            >
              {candidate.status === "Active" ? (
                <Ban className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {candidate.status === "Active" ? "Suspend Account" : "Reactivate Account"}
            </button>

            <button
              onClick={async () => {
                try {
                  if (candidate.verified) {
                    await store.unverifyCandidate(candidate.id);
                    toast.success("Candidate verification removed");
                  } else {
                    await store.verifyCandidate(candidate.id);
                    toast.success("Candidate verified successfully");
                  }
                } catch (e: any) {
                  toast.error(e.message || "Failed to update verification");
                }
              }}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                candidate.verified
                  ? "border-warning/30 text-warning hover:bg-warning/10"
                  : "border-success/30 text-success hover:bg-success/10"
              }`}
            >
              {candidate.verified ? (
                <ShieldOff className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {candidate.verified ? "Remove Verification" : "Verify Candidate"}
            </button>

            <button
              onClick={async () => {
                if (
                  !confirm(`Login as ${candidate.name}? You'll get a 1-hour impersonation session.`)
                )
                  return;
                try {
                  const result = await store.impersonateUser(candidate.userId || candidate.id);
                  const candidateUrl = getCandidatePortalUrl();
                  if (!candidateUrl) {
                    toast.error("Candidate URL not configured");
                    return;
                  }
                  window.open(
                    `${candidateUrl}/impersonate?token=${encodeURIComponent(result.token)}`,
                    "_blank",
                  );
                  toast.success(`Impersonating ${result.user.name} — 1 hour session`);
                } catch (e: any) {
                  toast.error(e.message || "Failed to impersonate");
                }
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Login as Candidate
            </button>

            <button
              onClick={async () => {
                if (confirm(`Are you sure you want to delete ${candidate.name}?`)) {
                  try {
                    await store.deleteCandidate(candidate.id);
                    toast.success("Candidate deleted");
                    router.history.back();
                  } catch (e: any) {
                    toast.error(e.message || "Failed to delete candidate");
                  }
                }
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-card px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete Candidate
            </button>
          </div>
        </div>
      </div>

      {/* CV & Documents */}
      {(hasCv || hasDocuments) && (
        <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
          <h2 className="text-base font-semibold">Documents</h2>

          {hasCv && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Curriculum Vitae</p>
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>{candidate.uploadedCvName || "CV Document"}</span>
                </div>
                <button
                  onClick={() => {
                    if (candidate.cvUrl) {
                      window.open(candidate.cvUrl, "_blank");
                    } else if (candidate.uploadedCvData) {
                      const a = document.createElement("a");
                      a.href = candidate.uploadedCvData;
                      a.download = candidate.uploadedCvName || "cv.pdf";
                      a.click();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                >
                  <Download className="h-3.5 w-3.5" />
                  View / Download
                </button>
              </div>
            </div>
          )}

          {hasDocuments && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Supporting Documents ({candidate.supportingDocuments!.length})
              </p>
              <div className="space-y-2">
                {candidate.supportingDocuments!.map((doc: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[260px]">
                        {doc.name || `Document ${i + 1}`}
                      </span>
                    </div>
                    <button
                      onClick={() => window.open(doc.url, "_blank")}
                      className="text-sm text-primary hover:underline font-medium shrink-0"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Applications History */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold">Application History</h2>
          <p className="text-sm text-muted-foreground">
            All jobs this candidate has applied to across the platform.
          </p>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Job Title
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Hospital
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Recruiter
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Applied Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    App Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const job = store.jobs.find((j) => j.id === app.jobId);
                  const hospital = job
                    ? store.hospitals.find((h) => h.id === job.hospitalId)
                    : null;
                  const recruiter = job
                    ? store.recruiters.find((r) => r.id === job.recruiterId)
                    : null;

                  return (
                    <tr
                      key={app.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        {job ? (
                          <Link
                            to="/jobs/$id"
                            params={{ id: job.id }}
                            className="hover:underline hover:text-primary"
                          >
                            {job.title}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground italic">Job Deleted</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hospital ? (
                          <Link
                            to="/hospitals"
                            className="inline-flex items-center gap-1.5 hover:underline"
                          >
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {hospital.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {recruiter ? (
                          <Link
                            to="/recruiters/$id"
                            params={{ id: recruiter.id }}
                            className="hover:underline"
                          >
                            {recruiter.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{app.applied}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-3">
                        {job && (
                          <Link
                            to="/jobs/$id"
                            params={{ id: job.id }}
                            className="rounded p-1.5 hover:bg-accent inline-flex"
                            title="View Job Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        )}
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
                icon={FileText}
                lottieFile="nothing_for_the_particular_query.json"
                title="No Applications"
                description="This candidate has not applied to any jobs yet."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
