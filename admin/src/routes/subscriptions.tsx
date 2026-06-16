import { createFileRoute } from "@tanstack/react-router";
import { useAdminStore } from "@/lib/admin-store";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { CreditCard, Edit, Ban, CheckCircle, X, History, AlertCircle } from "lucide-react";
import { apiBase, authHeader , apiFetch } from "@/lib/api";

export const Route = createFileRoute("/subscriptions")({
  component: SubscriptionsPage,
});

const PLANS = ["Basic", "Pro", "Premium"];

function SubscriptionsPage() {
  const store = useAdminStore();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);

  // Override Plan modal state
  const [overrideTarget, setOverrideTarget] = useState<any | null>(null);
  const [overridePlan, setOverridePlan] = useState("Pro");
  const [overrideExpiry, setOverrideExpiry] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Billing History drawer state
  const [billingTarget, setBillingTarget] = useState<any | null>(null);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${apiBase()}/api/admin/subscriptions`, { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.data || []);
      } else {
        toast.error("Failed to load subscriptions");
      }
    } catch (err) {
      toast.error("Network error loading subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleOverride = async () => {
    if (!overrideTarget) return;
    setOverrideLoading(true);
    try {
      await store.overrideHospitalPlan(
        overrideTarget.id,
        overridePlan,
        overrideExpiry || undefined,
        overrideNote || undefined,
      );
      toast.success(`Plan updated to ${overridePlan}`);
      setOverrideTarget(null);
      fetchSubscriptions();
    } catch (e: any) {
      toast.error(e.message || "Failed to update plan");
    } finally {
      setOverrideLoading(false);
    }
  };

  const openBillingHistory = async (plan: any) => {
    setBillingTarget(plan);
    setBillingLoading(true);
    try {
      const res = await apiFetch(`${apiBase()}/api/admin/subscriptions/${plan.id}/history`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setBillingHistory(data);
      }
    } catch {
      toast.error("Failed to load billing history");
    } finally {
      setBillingLoading(false);
    }
  };

  const handleSuspendToggle = async (plan: any) => {
    try {
      if (plan.isSuspended) {
        await store.reactivateSubscription(plan.id);
        toast.success("Subscription reactivated");
      } else {
        await store.suspendSubscription(plan.id);
        toast.success("Subscription suspended");
      }
      fetchSubscriptions();
    } catch (e: any) {
      toast.error(e.message || "Failed to update subscription");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscriptions & Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage hospital plans and view billing history
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hospital</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Current Plan
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Expires At
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Days Left</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Total Paid
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No subscription data found.
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.currentPlan === "Premium" ? "bg-primary/10 text-primary" : p.currentPlan === "Pro" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-muted text-muted-foreground"}`}
                      >
                        {p.currentPlan || "Basic"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={p.isSuspended ? "Suspended" : p.isExpired ? "Expired" : "Active"}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {p.planExpiresAt ? new Date(p.planExpiresAt).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      {!p.planExpiresAt ? (
                        <span className="text-xs text-muted-foreground font-medium">—</span>
                      ) : p.daysRemaining > 0 ? (
                        <span
                          className={`text-xs font-medium ${p.daysRemaining <= 7 ? "text-destructive" : "text-muted-foreground"}`}
                        >
                          {p.daysRemaining}d
                        </span>
                      ) : (
                        <span className="text-xs text-destructive font-medium">Expired</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      ₹{(p.totalPaid || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setOverrideTarget(p);
                            setOverridePlan(p.currentPlan || "Basic");
                            setOverrideExpiry("");
                            setOverrideNote("");
                          }}
                          className="rounded p-1.5 hover:bg-accent text-primary"
                          title="Override Plan"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openBillingHistory(p)}
                          className="rounded p-1.5 hover:bg-accent"
                          title="Billing History"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleSuspendToggle(p)}
                          className={`rounded p-1.5 hover:bg-accent ${p.isSuspended ? "text-success" : "text-destructive"}`}
                          title={p.isSuspended ? "Reactivate" : "Suspend"}
                        >
                          {p.isSuspended ? (
                            <CheckCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Ban className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Plan Modal */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Override Plan — {overrideTarget.name}</h3>
              <button
                onClick={() => setOverrideTarget(null)}
                className="rounded p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  New Plan
                </label>
                <select
                  value={overridePlan}
                  onChange={(e) => setOverridePlan(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {PLANS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Expiry Date (optional)
                </label>
                <input
                  type="date"
                  value={overrideExpiry}
                  onChange={(e) => setOverrideExpiry(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Note (optional)
                </label>
                <textarea
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  rows={2}
                  placeholder="Reason for plan change..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  This change will be recorded in billing history with payment status "Waived".
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOverrideTarget(null)}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleOverride}
                disabled={overrideLoading}
                className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {overrideLoading ? "Saving..." : "Apply Override"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing History Drawer */}
      {billingTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/20 backdrop-blur-sm"
          onClick={() => setBillingTarget(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] rounded-t-xl sm:rounded-xl border bg-card shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-base font-semibold">Billing History</h3>
                <p className="text-xs text-muted-foreground">{billingTarget.name}</p>
              </div>
              <button
                onClick={() => setBillingTarget(null)}
                className="rounded p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {billingLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
              ) : billingHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No billing history found.
                </p>
              ) : (
                <div className="space-y-3">
                  {billingHistory.map((entry: any) => (
                    <div key={entry.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {entry.fromPlan} → {entry.toPlan}
                        </span>
                        <StatusBadge status={entry.paymentStatus} />
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>
                          Type:{" "}
                          <span className="text-foreground capitalize">
                            {entry.changeType?.replace(/_/g, " ")}
                          </span>
                        </span>
                        <span>
                          Amount:{" "}
                          <span className="text-foreground font-medium">
                            ₹{(entry.amountPaid || 0).toLocaleString()}
                          </span>
                        </span>
                        <span>
                          Date:{" "}
                          <span className="text-foreground">
                            {new Date(entry.effectiveAt || entry.requestedAt).toLocaleDateString()}
                          </span>
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-xs text-muted-foreground italic">"{entry.note}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
