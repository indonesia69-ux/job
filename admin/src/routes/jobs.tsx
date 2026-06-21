import { createFileRoute, Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/StatusBadge";
import { Eye, Trash2, Flag, Ban, CheckCircle, Search, RefreshCw } from "lucide-react";
import { useAdminStore } from "@/lib/admin-store";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AdminEmptyState as EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/jobs")({
  component: JobsPage,
});

function JobsPage() {
  const store = useAdminStore();
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [flagAnimating, setFlagAnimating] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // A5: re-fetch fresh data every time the jobs page is mounted
  useEffect(() => {
    store.refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A5 Phase 1: refresh when admin returns to this tab/window (fallback if SSE is down)
  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") {
        void store.refreshAll();
      }
    };
    const onWindowFocus = () => {
      void store.refreshAll();
    };
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("focus", onWindowFocus);
    return () => {
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [store]);

  // A5 Phase 2: live refresh when a recruiter publishes a job (admin SSE channel)
  useEffect(() => {
    const onJobCreated = () => {
      void store.refreshAll();
    };
    window.addEventListener("sse_job_created", onJobCreated);
    return () => window.removeEventListener("sse_job_created", onJobCreated);
  }, [store]);

  const filteredJobs = store.jobs.filter((j) => {
    const hospital = store.hospitals.find((h) => h.id === j.hospitalId);
    if (statusFilter !== "All" && j.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const hospitalName = hospital?.name?.toLowerCase() || "";
      if (
        !j.title.toLowerCase().includes(q) &&
        !hospitalName.includes(q) &&
        !(j.location || "").toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  async function handleFlagToggle(id: string) {
    try {
      await store.toggleJobFlag(id);
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
      const job = store.jobs.find((j) => j.id === id);
      toast.success(job?.isFlagged ? "Flag removed" : "Job flagged");
    } catch (e: any) {
      toast.error(e.message || "Failed to toggle flag");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global view of all jobs across the platform
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={async () => {
              setRefreshing(true);
              try {
                await store.refreshAll();
                toast.success("Jobs refreshed");
              } catch {
                toast.error("Refresh failed");
              } finally {
                setRefreshing(false);
              }
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
            title="Refresh jobs from server"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, hospital, location…"
              className="h-9 w-56 rounded-lg border bg-card pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          {/* Status filter */}
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Posted By</th>
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
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${
                      j.isFlagged ? "bg-amber-500/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {j.title}
                        {j.isFlagged && (
                          <Flag className="h-3 w-3 text-amber-500 fill-amber-400 shrink-0" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{hospital?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {recruiter ? (
                        <Link
                          to="/recruiters/$id"
                          params={{ id: recruiter.id }}
                          className="hover:underline hover:text-primary"
                        >
                          {recruiter.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{j.location}</td>
                    <td className="px-4 py-3">{applicants}</td>
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
                        {/* Flag button — animated */}
                        <button
                          onClick={() => handleFlagToggle(j.id)}
                          title={j.isFlagged ? "Remove flag" : "Flag this job"}
                          className={`rounded p-1.5 hover:bg-accent transition-all duration-200 ${
                            flagAnimating.has(j.id) ? "animate-bounce" : ""
                          } ${
                            j.isFlagged
                              ? "text-amber-500"
                              : "text-muted-foreground hover:text-amber-500"
                          }`}
                        >
                          <Flag
                            className={`h-3.5 w-3.5 transition-all duration-200 ${
                              j.isFlagged ? "fill-amber-400" : ""
                            }`}
                          />
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
            description={
              searchQuery
                ? `No jobs match "${searchQuery}". Try a different search.`
                : "Jobs will appear here once recruiters start posting."
            }
          />
        </div>
      )}
    </div>
  );
}
