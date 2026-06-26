import { createFileRoute, Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/StatusBadge";
import { Eye, Flag } from "lucide-react";
import { useState } from "react";
import { useAdminStore } from "@/lib/admin-store";
import { toast } from "sonner";

export const Route = createFileRoute("/applications")({
  component: ApplicationsPage,
});

// Statuses must exactly match backend VALID_STATUSES list
const STATUSES = [
  "All",
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
];

function ApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [hospitalFilter, setHospitalFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("All");
  // Track which application IDs are mid-flag-animation
  const [flagAnimating, setFlagAnimating] = useState<Set<string>>(new Set());

  const { applications, hospitals, jobs, updateApplicationStatus, toggleApplicationFlag } =
    useAdminStore();

  const filtered = applications.filter((a) => {
    if (statusFilter !== "All" && a.status !== statusFilter) return false;
    if (jobFilter !== "All" && a.jobId !== jobFilter) return false;
    const jobForApp = jobs.find((j) => j.id === a.jobId);
    if (hospitalFilter !== "All" && jobForApp?.hospitalId !== hospitalFilter) return false;
    return true;
  });

  function openCv(a: (typeof applications)[0]) {
    const url = a.cvUrl;

    if (url) {
      // Cloudinary URL — open in new tab
      window.open(url, "_blank");
    } else {
      toast.info("No CV attached to this application.");
    }
  }

  async function handleFlagToggle(id: string) {
    try {
      await toggleApplicationFlag(id);
      // Trigger bounce animation
      setFlagAnimating((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setTimeout(() => {
        setFlagAnimating((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 600);
      const app = applications.find((a) => a.id === id);
      toast.success(app?.isFlagged ? "Flag removed" : "Application flagged");
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle flag");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Application Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Track and manage all job applications</p>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={hospitalFilter}
          onChange={(e) => {
            setHospitalFilter(e.target.value);
            setJobFilter("All");
          }}
          className="rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="All">All Hospitals</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>

        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="All">All Jobs</option>
          {jobs
            .filter((j) => (hospitalFilter === "All" ? true : j.hospitalId === hospitalFilter))
            .map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
        </select>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "border bg-card hover:bg-accent"
            }`}
          >
            {s === "All" ? "All" : s.replace(/([A-Z])/g, " $1").trim()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Candidate</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Job</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hospital</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Applied</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${
                    a.isFlagged ? "bg-amber-500/5" : ""
                  }`}
                >
                  {/* Candidate — linked to full profile */}
                  <td className="px-4 py-3 font-medium">
                    <Link
                      to="/candidates/$id"
                      params={{ id: a.candidateId }}
                      className="hover:underline hover:text-primary inline-flex items-center gap-1.5"
                    >
                      {a.candidate}
                      {a.isFlagged && (
                        <Flag className="h-3 w-3 text-amber-500 fill-amber-400 shrink-0" />
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{a.job}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.hospital}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.applied}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* View CV */}
                      <button
                        className="btn-icon rounded p-1.5 hover:bg-accent"
                        title="View CV"
                        onClick={() => openCv(a)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {/* Status override dropdown */}
                      <select
                        defaultValue=""
                        onChange={async (e) => {
                          if (!e.target.value) return;
                          try {
                            await updateApplicationStatus(a.id, e.target.value);
                            toast.success("Status updated");
                            e.target.value = "";
                          } catch (err: any) {
                            toast.error(err.message || "Failed to update status");
                          }
                        }}
                        className="rounded p-1 text-xs border bg-card hover:bg-accent focus:outline-none"
                        title="Override Status"
                      >
                        <option value="">Status…</option>
                        {STATUSES.filter((s) => s !== "All").map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/([A-Z])/g, " $1").trim()}
                          </option>
                        ))}
                      </select>

                      {/* Flag button — animated */}
                      <button
                        onClick={() => handleFlagToggle(a.id)}
                        title={a.isFlagged ? "Remove flag" : "Flag this application"}
                        className={`btn-icon rounded p-1.5 hover:bg-accent transition-all duration-200 ${
                          flagAnimating.has(a.id) ? "animate-bounce" : ""
                        } ${
                          a.isFlagged
                            ? "text-amber-500"
                            : "text-muted-foreground hover:text-amber-500"
                        }`}
                      >
                        <Flag
                          className={`h-3.5 w-3.5 transition-all duration-200 ${
                            a.isFlagged ? "fill-amber-400" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16">
          <p className="text-sm font-medium">No applications found</p>
          <p className="text-xs text-muted-foreground mt-1">
            No applications match the current filter.
          </p>
        </div>
      )}
    </div>
  );
}
