import { createFileRoute, Link } from "@tanstack/react-router";
import { StatusBadge, VerifiedBadge } from "@/components/StatusBadge";
import { Eye, Ban } from "lucide-react";
import { useAdminStore } from "@/lib/admin-store";
import { toast } from "sonner";

export const Route = createFileRoute("/candidates")({
  component: CandidatesPage,
});

function CandidatesPage() {
  const store = useAdminStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Candidate Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage all registered healthcare professionals
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
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
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {c.name}
                      {!(c as any).cvSource && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                          Incomplete
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.role}</td>
                  <td className="px-4 py-3">{c.specialty}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.experience}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={(c as any).isSuspended ? "Suspended" : c.status} />
                  </td>
                  <td className="px-4 py-3">
                    <VerifiedBadge verified={c.verified} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.joined}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        to="/candidates/$id"
                        params={{ id: c.id }}
                        className="rounded p-1.5 hover:bg-accent inline-flex"
                        title="View Candidate Profile"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => {
                          toast.promise(store.toggleCandidateBlock(c.id), {
                            loading: "Updating…",
                            success: `Candidate ${(c as any).isSuspended ? "reactivated" : "suspended"}`,
                            error: "Failed to update candidate",
                          });
                        }}
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
    </div>
  );
}
