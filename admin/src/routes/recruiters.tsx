import { createFileRoute } from "@tanstack/react-router";
import { StatusBadge, VerifiedBadge } from "@/components/StatusBadge";
import { useState } from "react";
import { Eye, Ban, X, Key, Trash2, LogIn } from "lucide-react";
import { useAdminStore } from "@/lib/admin-store";
import { toast } from "sonner";

export const Route = createFileRoute("/recruiters")({
  component: RecruitersPage,
});

function RecruitersPage() {
  const store = useAdminStore();
  const [selected, setSelected] = useState<string | null>(null);
  const detail = store.recruiters.find((r) => r.id === selected);

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

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 rounded-xl border bg-card shadow-sm overflow-hidden min-w-0">
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
                          <button
                            onClick={() => setSelected(r.id)}
                            className="rounded p-1.5 hover:bg-accent"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
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

        {detail && (
          <div className="w-full xl:w-[360px] shrink-0 rounded-xl border bg-card shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Recruiter Details</h3>
              <button onClick={() => setSelected(null)} className="rounded p-1 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy-50 text-primary font-bold text-lg">
                {detail.name[0]}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{detail.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{detail.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hospital</p>
                <p className="text-sm">
                  {store.hospitals.find((h) => h.id === detail.hospitalId)?.name || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={detail.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="text-sm">{detail.joined}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={async () => {
                  try {
                    await store.toggleRecruiterBlock(detail.id);
                    toast.success(
                      `Recruiter ${detail.status === "Active" ? "suspended" : "reactivated"}`,
                    );
                  } catch (e: any) {
                    toast.error(e.message || "Failed to toggle status");
                  }
                }}
                className={`rounded-lg px-3 py-2 text-xs font-medium ${
                  detail.status === "Active"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-success text-success-foreground hover:bg-success/90"
                }`}
              >
                {detail.status === "Active" ? "Block Recruiter" : "Unblock Recruiter"}
              </button>
              <button
                onClick={async () => {
                  const input = window.prompt(
                    "Enter new password, or leave blank to auto-generate a secure random password.",
                  );
                  if (input === null) return; // cancelled

                  const mode = input.trim() ? "custom" : "generate";
                  try {
                    const res = await store.resetRecruiterPassword(
                      detail.id,
                      mode,
                      input.trim() || undefined,
                    );
                    if (mode === "generate" && res.temporaryPassword) {
                      window.alert(
                        `Password reset successful!\n\nNew Temporary Password: ${res.temporaryPassword}\n\nPlease copy and share this securely with the recruiter.`,
                      );
                    } else {
                      toast.success("Password reset successfully");
                    }
                  } catch (e: any) {
                    toast.error(e.message || "Failed to reset password");
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                <Key className="h-3.5 w-3.5" />
                Reset Password
              </button>
              <button
                onClick={async () => {
                  if (
                    !confirm(
                      `Login as ${detail.name}? This will give you a 1-hour session token impersonating this recruiter.`,
                    )
                  )
                    return;
                  try {
                    const result = await store.impersonateUser(detail.id);
                    // Open recruiter app in new tab with impersonated token
                    const recruiterUrl =
                      import.meta.env.VITE_RECRUITER_URL || "http://localhost:5174";
                    const url = `${recruiterUrl}/impersonate?token=${encodeURIComponent(result.token)}`;
                    window.open(url, "_blank");
                    toast.success(`Impersonating ${result.user.name} — session expires in 1 hour`);
                  } catch (e: any) {
                    toast.error(e.message || "Failed to impersonate user");
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/20 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"
              >
                <LogIn className="h-3.5 w-3.5" />
                Login as Recruiter
              </button>
              <button
                onClick={async () => {
                  if (
                    !confirm(
                      "Are you sure you want to delete this recruiter? This action is permanent.",
                    )
                  )
                    return;
                  try {
                    await store.deleteRecruiter(detail.id);
                    setSelected(null);
                    toast.success("Recruiter deleted");
                  } catch (e: any) {
                    toast.error(e.message || "Failed to delete recruiter");
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-destructive border-destructive/20 hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Recruiter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
