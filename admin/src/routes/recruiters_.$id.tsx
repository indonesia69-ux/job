import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useAdminStore } from "@/lib/admin-store";
import { StatusBadge, VerifiedBadge } from "@/components/StatusBadge";
import { AdminEmptyState as EmptyState } from "@/components/common/EmptyState";
import { toast } from "sonner";
import {
  Building2,
  ArrowLeft,
  Briefcase,
  Eye,
  Trash2,
  Ban,
  CheckCircle,
  Key,
  LogIn,
  Users,
  TrendingUp,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/recruiters_/$id")({
  component: RecruiterDetailsPage,
});

function RecruiterDetailsPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const store = useAdminStore();

  const recruiter = store.recruiters.find((r) => r.id === id);
  const hospital = store.hospitals.find((h) => h.id === recruiter?.hospitalId);
  const jobs = store.jobs.filter((j) => j.hospitalId === recruiter?.hospitalId);

  // Loading guard — store data may not be populated yet on direct URL navigation
  if (store.isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!recruiter) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-4">
        <p className="text-muted-foreground text-lg">Recruiter not found.</p>
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
  const totalApplicants = jobs.reduce(
    (sum, j) => sum + store.applications.filter((a) => a.jobId === j.id).length,
    0,
  );
  const activeJobs = jobs.filter((j) => j.status === "Active").length;

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
        <Link to="/recruiters" className="hover:text-foreground transition-colors">
          Recruiters
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">{recruiter.name}</span>
      </nav>

      {/* Recruiter Header Card */}
      <div className="rounded-xl border bg-card shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-2xl">
              {recruiter.name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{recruiter.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-muted-foreground text-sm">
                <span>{recruiter.email}</span>
                <span>•</span>
                <span>{recruiter.role}</span>
                <span>•</span>
                <span>Joined {recruiter.joined}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <StatusBadge status={recruiter.status} />
                <VerifiedBadge verified={store.isRecruiterVerified(recruiter.id)} />
                {hospital && (
                  <Link
                    to="/hospitals"
                    className="inline-flex items-center gap-1.5 ml-3 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2.5 py-1 rounded-md transition-colors"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    {hospital.name}
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={async () => {
                try {
                  await store.toggleRecruiterBlock(recruiter.id);
                  toast.success(
                    `Recruiter ${recruiter.status === "Active" ? "suspended" : "reactivated"}`,
                  );
                } catch (e: any) {
                  toast.error(e.message || "Failed to toggle status");
                }
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                recruiter.status === "Active"
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "bg-success/10 text-success hover:bg-success/20"
              }`}
            >
              {recruiter.status === "Active" ? (
                <Ban className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {recruiter.status === "Active" ? "Block Recruiter" : "Unblock Recruiter"}
            </button>

            <button
              onClick={async () => {
                const input = window.prompt(
                  "Enter new password, or leave blank to auto-generate a secure random password.",
                );
                if (input === null) return;
                const mode = input.trim() ? "custom" : "generate";
                try {
                  const res = await store.resetRecruiterPassword(
                    recruiter.id,
                    mode,
                    input.trim() || undefined,
                  );
                  if (mode === "generate" && res.temporaryPassword) {
                    window.alert(
                      `Password reset!\n\nTemporary Password: ${res.temporaryPassword}\n\nPlease share this securely with the recruiter.`,
                    );
                  } else {
                    toast.success("Password reset successfully");
                  }
                } catch (e: any) {
                  toast.error(e.message || "Failed to reset password");
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Key className="h-4 w-4" />
              Reset Password
            </button>

            <button
              onClick={async () => {
                if (
                  !confirm(`Login as ${recruiter.name}? This gives a 1-hour impersonation session.`)
                )
                  return;
                try {
                  const result = await store.impersonateUser(recruiter.id);
                  const recruiterUrl =
                    import.meta.env.VITE_RECRUITER_URL || "http://localhost:8081";
                  const url = `${recruiterUrl}/impersonate?token=${encodeURIComponent(result.token)}`;
                  const popup = window.open(url, "_blank");
                  if (!popup) {
                    navigator.clipboard
                      .writeText(url)
                      .then(() =>
                        toast.info("Popup blocked — impersonation link copied to clipboard"),
                      );
                  } else {
                    toast.success(`Impersonating ${result.user.name} — session expires in 1 hour`);
                  }
                } catch (e: any) {
                  toast.error(e.message || "Failed to impersonate user");
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/20 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Login as Recruiter
            </button>

            <button
              onClick={async () => {
                if (
                  confirm(
                    `Are you sure you want to delete ${recruiter.name}? This action cannot be undone.`,
                  )
                ) {
                  try {
                    await store.deleteRecruiter(recruiter.id);
                    toast.success("Recruiter deleted");
                    router.history.back();
                  } catch (e: any) {
                    toast.error(e.message || "Failed to delete recruiter");
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
          { label: "Total Jobs", value: jobs.length, icon: <Briefcase className="h-4 w-4" /> },
          { label: "Active Jobs", value: activeJobs, icon: <TrendingUp className="h-4 w-4" /> },
          {
            label: "Inactive / Closed",
            value: jobs.length - activeJobs,
            icon: <Ban className="h-4 w-4" />,
          },
          {
            label: "Total Applicants",
            value: totalApplicants,
            icon: <Users className="h-4 w-4" />,
          },
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

      {/* Jobs Table */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold">Jobs at Hospital</h2>
          <p className="text-sm text-muted-foreground">
            All healthcare opportunities at {hospital?.name || "this hospital"}
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
                    Location
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Applicants
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Posted</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const applicantsCount = store.applications.filter((a) => a.jobId === j.id).length;
                  return (
                    <tr
                      key={j.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        <Link
                          to="/jobs/$id"
                          params={{ id: j.id }}
                          className="hover:underline hover:text-primary"
                        >
                          {j.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{j.location}</td>
                      <td className="px-4 py-3 font-medium">{applicantsCount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={j.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{j.posted}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            to="/jobs/$id"
                            params={{ id: j.id }}
                            className="rounded p-1.5 hover:bg-accent inline-flex"
                            title="View Job Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={async () => {
                              try {
                                const newStatus =
                                  (j.status as string) === "Suspended" ? "Active" : "Suspended";
                                await store.updateJobStatus(j.id, newStatus);
                                toast.success(
                                  `Job ${newStatus === "Active" ? "reactivated" : "suspended"}`,
                                );
                              } catch (e: any) {
                                toast.error(e.message || "Failed to update job");
                              }
                            }}
                            className={`rounded p-1.5 hover:bg-accent ${j.status === "Active" ? "text-destructive" : "text-success"}`}
                            title={j.status === "Active" ? "Suspend Job" : "Reactivate Job"}
                          >
                            {(j.status as string) === "Suspended" ? (
                              <CheckCircle className="h-3.5 w-3.5" />
                            ) : (
                              <Ban className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {jobs.length === 0 && (
            <div className="p-8">
              <EmptyState
                icon={Briefcase}
                lottieFile="nothing_for_the_particular_query.json"
                title="No Jobs Posted"
                description="This recruiter hasn't posted any jobs yet."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
