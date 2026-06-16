import { createFileRoute, Link } from "@tanstack/react-router";
import { StatusBadge, VerifiedBadge } from "@/components/StatusBadge";
import { Eye, Ban } from "lucide-react";
import { useAdminStore } from "@/lib/admin-store";
import { toast } from "sonner";

export const Route = createFileRoute("/recruiters")({
  component: RecruitersPage,
});

function RecruitersPage() {
  const store = useAdminStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recruiter Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and manage all recruiters on the platform
          </p>
        </div>
      </div>

      <div>
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Recruiter Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Hospital
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {store.recruiters.map((r) => {
                  const hospitalName =
                    store.hospitals.find((h) => h.id === r.hospitalId)?.name || "Unknown";
                  return (
                    <tr
                      key={r.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                      <td className="px-4 py-3">{hospitalName}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.joined}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            to="/recruiters/$id"
                            params={{ id: r.id }}
                            className="rounded p-1.5 hover:bg-accent inline-flex"
                            title="View Recruiter Profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => store.toggleRecruiterBlock(r.id)}
                            className={`rounded p-1.5 hover:bg-accent ${r.status === "Active" ? "text-destructive" : ""}`}
                            title={r.status === "Active" ? "Block" : "Unblock"}
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
        </div>
      </div>
    </div>
  );
}
