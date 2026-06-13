import { createFileRoute } from "@tanstack/react-router";
import { StatusBadge } from "@/components/StatusBadge";
import { Eye, Trash2, Flag, Ban, CheckCircle, Search } from "lucide-react";
import { useAdminStore } from "@/lib/admin-store";
import { useState } from "react";
import { toast } from "sonner";
import { AdminEmptyState as EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/jobs")({
  component: JobsPage,
});

function JobsPage() {
  const store = useAdminStore();
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredJobs = store.jobs.filter((j) =>
    statusFilter === "All" ? true : j.status === statusFilter,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global view of all jobs across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Closed">Closed</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Job Title</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hospital</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recruiter</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Applicants
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Posted</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((j) => {
                const hospital = store.hospitals.find((h) => h.id === j.hospitalId);
                const recruiter = store.recruiters.find((r) => r.id === j.recruiterId);
                const applicants = store.applications.filter((a) => a.jobId === j.id).length;
                return (
                  <tr
                    key={j.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{j.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{hospital?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{recruiter?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{j.location}</td>
                    <td className="px-4 py-3">{applicants}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{j.posted}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="rounded p-1.5 hover:bg-accent" title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
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
                        <button
                          onClick={async () => {
                            if (confirm(`Delete job "${j.title}"?`)) {
                              try {
                                await store.deleteJob(j.id);
                                toast.success("Job deleted");
                              } catch (e: any) {
                                toast.error(e.message || "Failed to delete job");
                              }
                            }
                          }}
                          className="rounded p-1.5 hover:bg-accent text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await store.toggleJobFlag(j.id);
                              toast.success("Flag toggled");
                            } catch (e: any) {
                              toast.error(e.message || "Failed to toggle flag");
                            }
                          }}
                          className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-destructive"
                          title="Flag Job"
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredJobs.length === 0 && (
        <div className="mt-8">
          <EmptyState
            icon={Flag}
            lottieFile="nothing_for_the_particular_query.json"
            title="No jobs found"
            description="Jobs will appear here once recruiters start posting."
          />
        </div>
      )}
    </div>
  );
}
