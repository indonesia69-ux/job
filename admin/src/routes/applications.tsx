import { createFileRoute } from "@tanstack/react-router";
// import { applications } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { Eye, Flag, RefreshCw } from "lucide-react";
import { useState } from "react";

import { useAdminStore } from "@/lib/admin-store";
import { toast } from "sonner";

export const Route = createFileRoute("/applications")({
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [hospitalFilter, setHospitalFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("All");
  const { applications, hospitals, jobs, updateApplicationStatus, toggleApplicationFlag } =
    useAdminStore();
  const statuses = [
    "All",
    "Pending",
    "Reviewed",
    "Shortlisted",
    "Rejected",
    "InterviewScheduled",
    "InterviewCompleted",
    "InterviewRescheduled",
    "InterviewCancelled",
    "InterviewNoShow",
    "OfferLetterRequested",
    "OfferLetterProcessing",
    "OfferLetterCirculated",
    "OfferAccepted",
    "OfferRejected",
    "Joined",
  ];
  const filtered = applications.filter((a) => {
    if (statusFilter !== "All" && a.status !== statusFilter) return false;
    if (jobFilter !== "All" && a.jobId !== jobFilter) return false;
    // job object has hospitalId
    const jobForApp = jobs.find((j) => j.id === a.jobId);
    if (hospitalFilter !== "All" && jobForApp?.hospitalId !== hospitalFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Application Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Track and manage all job applications</p>
      </div>

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

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-accent"}`}
          >
            {s.replace(/([A-Z])/g, " $1").trim()}
          </button>
        ))}
      </div>

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
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{a.candidate}</td>
                  <td className="px-4 py-3">{a.job}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.hospital}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.applied}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        className="rounded p-1.5 hover:bg-accent"
                        title="View CV"
                        onClick={() => {
                          if (a.cvUrl) {
                            window.open(a.cvUrl, "_blank");
                          } else {
                            alert("No CV attached to this application");
                          }
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <select
                        onChange={async (e) => {
                          if (!e.target.value) return;
                          try {
                            await updateApplicationStatus(a.id, e.target.value);
                            toast.success("Application status updated");
                            e.target.value = "";
                          } catch (err: any) {
                            toast.error(err.message || "Failed to update status");
                          }
                        }}
                        className="rounded p-1 text-xs border bg-card hover:bg-accent focus:outline-none"
                        title="Override Status"
                      >
                        <option value="">Status...</option>
                        {statuses
                          .filter((s) => s !== "All")
                          .map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={async () => {
                          try {
                            await toggleApplicationFlag(a.id);
                            toast.success("Flag toggled");
                          } catch (err: any) {
                            toast.error(err.message || "Failed to toggle flag");
                          }
                        }}
                        className="rounded p-1.5 hover:bg-accent"
                        title="Flag"
                      >
                        <Flag className="h-3.5 w-3.5" />
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
