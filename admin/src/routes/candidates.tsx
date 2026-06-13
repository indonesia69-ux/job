import { createFileRoute } from "@tanstack/react-router";
import { StatusBadge, VerifiedBadge } from "@/components/StatusBadge";
import { useState } from "react";
import { Eye, Ban, ShieldCheck, X, Trash2, LogIn, CheckCircle, Clock } from "lucide-react";
import { useAdminStore } from "@/lib/admin-store";
import { toast } from "sonner";
import { AdminEmptyState as EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/candidates")({
  component: CandidatesPage,
});

// Application status milestone order for the timeline
const MILESTONES = [
  { key: "appliedOn", label: "Applied" },
  { key: "reviewedAt", label: "Reviewed" },
  { key: "interviewScheduledAt", label: "Interview Scheduled" },
  { key: "interviewCompletedAt", label: "Interview Completed" },
  { key: "shortlistedAt", label: "Shortlisted" },
  { key: "offerSentAt", label: "Offer Sent" },
  { key: "offerAcceptedAt", label: "Offer Accepted" },
  { key: "joinedAt", label: "Joined" },
];

function ApplicationTimeline({ app }: { app: any }) {
  const reached = MILESTONES.filter((m) => app[m.key]);
  if (reached.length === 0) return null;

  return (
    <div className="relative pl-5 space-y-2 py-1">
      {/* Vertical line */}
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
      {reached.map((m, i) => (
        <div key={m.key} className="flex items-start gap-2.5 relative">
          <div
            className={`relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${i === reached.length - 1 ? "border-primary bg-primary" : "border-muted-foreground/40 bg-card"}`}
          >
            {i === reached.length - 1 ? (
              <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
            ) : (
              <CheckCircle className="h-2.5 w-2.5 text-muted-foreground/60" />
            )}
          </div>
          <div>
            <p className="text-[11px] font-medium leading-tight">{m.label}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(app[m.key]).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CandidatesPage() {
  const store = useAdminStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "applications">("profile");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  const detail = store.candidates.find((c) => c.id === selected);
  const appliedJobs = detail ? store.applications.filter((a) => a.candidateId === detail.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Candidate Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage all registered healthcare professionals
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Table */}
        <div className="flex-1 rounded-xl border bg-card shadow-sm overflow-hidden min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Specialty
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Experience
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Verified
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {store.candidates.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${selected === c.id ? "bg-muted/20" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.role}</td>
                    <td className="px-4 py-3">{c.specialty}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.experience}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.isSuspended ? "Suspended" : c.status} />
                    </td>
                    <td className="px-4 py-3">
                      <VerifiedBadge verified={c.verified} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.joined}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelected(c.id);
                            setActiveTab("profile");
                            setExpandedApp(null);
                          }}
                          className="rounded p-1.5 hover:bg-accent"
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => store.toggleCandidateBlock(c.id)}
                          className={`rounded p-1.5 hover:bg-accent ${(c as any).isSuspended ? "text-success" : "text-destructive"}`}
                          title={(c as any).isSuspended ? "Unblock" : "Block"}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {detail && (
          <div className="w-full xl:w-[380px] shrink-0 rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {detail.name
                    .split(" ")
                    .map((w: string) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">{detail.name}</p>
                  <p className="text-xs text-muted-foreground">{detail.role}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded p-1 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeTab === "profile" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab("applications")}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeTab === "applications" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                Applications ({appliedJobs.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === "profile" ? (
                <>
                  {/* Profile Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                        Specialty
                      </p>
                      <p className="text-sm">{detail.specialty || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                        Experience
                      </p>
                      <p className="text-sm">{detail.experience || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                        Status
                      </p>
                      <StatusBadge
                        status={(detail as any).isSuspended ? "Suspended" : detail.status}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                        Verified
                      </p>
                      <VerifiedBadge verified={detail.verified} />
                    </div>
                  </div>

                  {/* CV */}
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Attached CV</p>
                    {detail.cvUrl || detail.uploadedCvData ? (
                      <div className="flex items-center justify-between rounded bg-muted/50 p-2">
                        <span className="truncate text-[12px]">
                          {detail.uploadedCvName || "CV Document"}
                        </span>
                        <button
                          onClick={() => {
                            if (detail.cvUrl) window.open(detail.cvUrl, "_blank");
                            else if (detail.uploadedCvData) {
                              const a = document.createElement("a");
                              a.href = detail.uploadedCvData;
                              a.download = detail.uploadedCvName || "cv.pdf";
                              a.click();
                            }
                          }}
                          className="text-[12px] text-primary hover:underline font-medium"
                        >
                          View / Download
                        </button>
                      </div>
                    ) : (
                      <div className="h-14 rounded bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
                        No CV uploaded
                      </div>
                    )}
                  </div>

                  {/* Supporting Documents */}
                  {detail.supportingDocuments && detail.supportingDocuments.length > 0 && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Supporting Documents
                      </p>
                      <div className="space-y-2">
                        {detail.supportingDocuments.map((doc: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded bg-muted/50 p-2"
                          >
                            <span className="truncate text-[12px]">
                              {doc.name || `Document ${i + 1}`}
                            </span>
                            <button
                              onClick={() => window.open(doc.url, "_blank")}
                              className="text-[12px] text-primary hover:underline font-medium"
                            >
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={async () => {
                        try {
                          await store.toggleCandidateBlock(detail.id);
                          toast.success(
                            `Candidate ${(detail as any).isSuspended ? "reactivated" : "suspended"}`,
                          );
                        } catch (e: any) {
                          toast.error(e.message || "Failed to toggle status");
                        }
                      }}
                      className={`rounded-lg px-3 py-2 text-xs font-medium ${(detail as any).isSuspended ? "bg-success text-success-foreground hover:bg-success/90" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}`}
                    >
                      {(detail as any).isSuspended ? "Unblock Account" : "Block Account"}
                    </button>
                    <button
                      onClick={async () => {
                        if (
                          !confirm(
                            `Login as ${detail.name}? You'll get a 1-hour impersonation session.`,
                          )
                        )
                          return;
                        try {
                          const result = await store.impersonateUser(
                            (detail as any).userId || detail.id,
                          );
                          const candidateUrl =
                            import.meta.env.VITE_CANDIDATE_URL || "http://localhost:5173";
                          window.open(
                            `${candidateUrl}/impersonate?token=${encodeURIComponent(result.token)}`,
                            "_blank",
                          );
                          toast.success(`Impersonating ${result.user.name} — 1 hour session`);
                        } catch (e: any) {
                          toast.error(e.message || "Failed to impersonate");
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/20 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Login as Candidate
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this candidate? This cannot be undone.")) return;
                        try {
                          await store.deleteCandidate(detail.id);
                          setSelected(null);
                          toast.success("Candidate deleted");
                        } catch (e: any) {
                          toast.error(e.message || "Failed to delete");
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/20 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Candidate
                    </button>
                  </div>
                </>
              ) : (
                /* Applications Tab */
                <div className="space-y-3">
                  {appliedJobs.length === 0 ? (
                    <div className="py-10">
                      <EmptyState
                        icon={Clock}
                        lottieFile="nothing_for_the_particular_query.json"
                        title="No applications found"
                        description="This candidate hasn't applied to any jobs yet."
                      />
                    </div>
                  ) : (
                    appliedJobs.map((app: any) => (
                      <div key={app.id} className="rounded-lg border overflow-hidden">
                        <button
                          onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="text-left">
                            <p className="text-xs font-semibold">
                              {app.job || app.jobTitle || "Job"}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {app.hospital || app.hospitalName || ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <StatusBadge status={app.status} />
                            <span className="text-muted-foreground text-xs">
                              {expandedApp === app.id ? "▲" : "▼"}
                            </span>
                          </div>
                        </button>

                        {expandedApp === app.id && (
                          <div className="border-t px-3 py-3 bg-muted/10">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                              Application Timeline
                            </p>
                            <ApplicationTimeline app={app} />
                            <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
                              Applied:{" "}
                              {app.applied || app.appliedOn
                                ? new Date(app.applied || app.appliedOn).toLocaleDateString()
                                : "—"}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
