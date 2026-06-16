import { useState, useEffect } from "react";
import {
  Crown,
  Sparkles,
  CalendarDays,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  PhoneCall,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { usePlan } from "@/features/search/PlanContext";
import {
  createPaymentOrder,
  verifyPayment,
  scheduleRenewalChange,
  cancelRenewalChange,
  fetchPlanHistory,
  type PlanTier,
  type PlanChangeEntry,
} from "@/lib/recruiterData";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

// ─── Plan definitions ─────────────────────────────────────────────────────────

type PlanFeature = { label: string; included: boolean };

const PLAN_FEATURES: Record<PlanTier, PlanFeature[]> = {
  Basic: [
    { label: "Up to 5 job posts / month", included: true },
    { label: "30 premium candidate searches / month", included: true },
    { label: "Up to 3 recruiters", included: true },
    { label: "Standard job visibility (17.5 days)", included: true },
    { label: "Priority candidate matching", included: false },
    { label: "Extended job visibility (30 days)", included: false },
    { label: "Unlimited recruiters", included: false },
  ],
  Pro: [
    { label: "Up to 10 job posts / month", included: true },
    { label: "50 premium candidate searches / month", included: true },
    { label: "Up to 10 recruiters", included: true },
    { label: "Extended job visibility (21 days)", included: true },
    { label: "Priority candidate matching", included: true },
    { label: "Extended job visibility (30 days)", included: false },
    { label: "Unlimited recruiters", included: false },
  ],
  Premium: [
    { label: "Up to 15 job posts / month", included: true },
    { label: "100 premium candidate searches / month", included: true },
    { label: "Unlimited recruiters", included: true },
    { label: "Extended job visibility (30 days)", included: true },
    { label: "Priority candidate matching", included: true },
    { label: "Dedicated support", included: true },
    { label: "Advanced analytics", included: true },
  ],
};

const PLAN_ORDER: PlanTier[] = ["Basic", "Pro", "Premium"];

const PLAN_COLORS: Record<PlanTier, string> = {
  Basic: "from-slate-800 to-slate-900",
  Pro: "from-violet-900 to-indigo-900",
  Premium: "from-amber-800 to-orange-900",
};

const PLAN_ACCENT: Record<PlanTier, string> = {
  Basic: "oklch(0.65 0.06 230)",
  Pro: "oklch(0.72 0.18 290)",
  Premium: "oklch(0.82 0.14 85)",
};

function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Payment is only available in the browser"));
  }
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Razorpay checkout")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

const PLAN_BADGE_CLASS: Record<PlanTier, string> = {
  Basic: "bg-slate-100 text-slate-800 border-slate-300",
  Pro: "bg-violet-100 text-violet-800 border-violet-300",
  Premium: "bg-amber-100 text-amber-800 border-amber-300",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function changeTypeLabel(ct: string): string {
  const map: Record<string, string> = {
    immediate_upgrade: "Immediate Upgrade",
    scheduled_upgrade: "Scheduled Upgrade",
    scheduled_downgrade: "Scheduled Downgrade",
    renewal: "Renewal",
  };
  return map[ct] ?? ct;
}

// ─── Payment Modal (Immediate Upgrade) ────────────────────────────────────────

function PaymentModal({
  open,
  onClose,
  targetPlan,
  currentPlan,
  daysRemaining,
  cost,
  planPrices,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  targetPlan: PlanTier;
  currentPlan: PlanTier;
  daysRemaining: number;
  cost: number;
  planPrices: Record<string, number>;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const priceDiff =
    daysRemaining > 0
      ? (planPrices[targetPlan] ?? 0) - (planPrices[currentPlan] ?? 0)
      : (planPrices[targetPlan] ?? 0);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await loadRazorpayCheckout();
      const order = await createPaymentOrder(targetPlan);

      await new Promise<void>((resolve, reject) => {
        if (!window.Razorpay) {
          reject(new Error("Razorpay checkout is unavailable"));
          return;
        }

        const checkout = new window.Razorpay({
          key: order.keyId,
          amount: Math.round(order.amount * 100),
          currency: order.currency,
          name: "ApronHanger",
          description: `${targetPlan} plan ${daysRemaining > 0 ? "upgrade" : "renewal"}`,
          order_id: order.orderId,
          handler: async (response) => {
            try {
              await verifyPayment(response);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          theme: { color: "#144A7A" },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled")),
          },
        });

        checkout.open();
      });

      toast.success(
        daysRemaining > 0
          ? `Upgraded to ${targetPlan}! New features are now active.`
          : `Plan renewed at ${targetPlan}! New features are now active.`,
      );
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upgrade failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-[18px]">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {daysRemaining > 0 ? `Upgrade to ${targetPlan}` : `Renew as ${targetPlan}`}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            {daysRemaining > 0
              ? "Your plan upgrades immediately. Features unlock right away."
              : "Your account is renewed immediately for a fresh 30-day cycle."}
          </DialogDescription>
        </DialogHeader>

        {/* Cost breakdown */}
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-[13px]">
          {daysRemaining > 0 ? (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>
                  Price difference ({currentPlan} → {targetPlan})
                </span>
                <span className="font-medium text-foreground">
                  {formatCurrency(priceDiff)} / mo
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Days remaining in cycle</span>
                <span className="font-medium text-foreground">{daysRemaining} days</span>
              </div>
              <div className="h-px bg-border" />
              <div className="rounded-lg bg-primary/5 px-3 py-2 font-mono text-[12px] text-muted-foreground">
                {formatCurrency(priceDiff)} × ({daysRemaining} / 30) ={" "}
                <span className="font-semibold text-foreground">{formatCurrency(cost)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-muted-foreground">
              <span>Full cycle renewal (30 days)</span>
              <span className="font-medium text-foreground">{formatCurrency(cost)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-semibold">Amount due today</span>
            <span className="font-display text-[18px] font-semibold text-foreground">
              {formatCurrency(cost)}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-2 text-[12px] text-amber-800">
          <strong>Razorpay checkout</strong> — use configured Razorpay test credentials until live
          payments are enabled.
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading} className="gap-1.5">
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading
              ? "Processing…"
              : `Pay ${formatCurrency(cost)} & ${daysRemaining > 0 ? "Upgrade" : "Renew"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Renewal Confirm Dialog ───────────────────────────────────────────────────

function RenewalDialog({
  open,
  onClose,
  targetPlan,
  currentPlan,
  planExpiresAt,
  isDowngrade,
  onSuccess,
  planPrices,
}: {
  open: boolean;
  onClose: () => void;
  targetPlan: PlanTier;
  currentPlan: PlanTier;
  planExpiresAt: string | null;
  isDowngrade: boolean;
  onSuccess: () => void;
  planPrices: Record<string, number>;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await scheduleRenewalChange(targetPlan);
      toast.success(
        isDowngrade
          ? `Downgrade to ${targetPlan} scheduled. Your ${currentPlan} plan stays active until ${formatDate(planExpiresAt)}.`
          : `Upgrade to ${targetPlan} scheduled for your next renewal.`,
      );
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to schedule plan change");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-[17px]">
            {isDowngrade ? (
              <TrendingDown className="h-5 w-5 text-slate-500" />
            ) : (
              <TrendingUp className="h-5 w-5 text-violet-500" />
            )}
            {isDowngrade ? "Schedule Downgrade" : "Schedule Upgrade at Renewal"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-[13px]">
          <div className="flex items-center gap-2">
            <span className="font-medium">{currentPlan}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{targetPlan}</span>
          </div>
          {isDowngrade ? (
            <p className="text-muted-foreground">
              Your current <strong>{currentPlan}</strong> plan will remain active until{" "}
              <strong>{formatDate(planExpiresAt)}</strong>. The <strong>{targetPlan}</strong> plan
              will automatically start after that.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Your plan will upgrade to <strong>{targetPlan}</strong> at your next renewal on{" "}
              <strong>{formatDate(planExpiresAt)}</strong>. You'll be billed the full{" "}
              <strong>₹{(planPrices[targetPlan] ?? 0).toLocaleString("en-IN")}/month</strong> rate
              at that time.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            variant={isDowngrade ? "outline" : "default"}
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Confirm Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main PlanTab ─────────────────────────────────────────────────────────────

export function PlanTab() {
  const {
    plan,
    planExpiresAt,
    pendingPlan,
    pendingPlanAt,
    daysRemaining,
    planPrices,
    upgradeCostPreview,
    refreshPlan,
  } = usePlan();

  const [upgradeTarget, setUpgradeTarget] = useState<PlanTier | null>(null);
  const [renewalTarget, setRenewalTarget] = useState<PlanTier | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<PlanChangeEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchPlanHistory();
      setHistory(data);
    } catch {
      toast.error("Failed to load plan history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (historyOpen && history.length === 0) {
      void loadHistory();
    }
  }, [historyOpen]);

  const handleCancelScheduled = async () => {
    setCancelLoading(true);
    try {
      await cancelRenewalChange();
      toast.success("Scheduled plan change has been cancelled.");
      refreshPlan();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleUpgradeSuccess = () => {
    refreshPlan();
    void loadHistory();
  };

  const isUpgrade = (target: PlanTier) => PLAN_ORDER.indexOf(target) > PLAN_ORDER.indexOf(plan);
  const isCurrentPlan = (target: PlanTier) => target === plan;

  return (
    <div className="space-y-6">
      {/* ── Current Plan Card ── */}
      <Card className="border-border bg-card shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${PLAN_COLORS[plan]} text-white shadow-md`}
              >
                <Crown className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[20px] font-semibold">{plan} Plan</span>
                  <Badge className={`text-[10px] border ${PLAN_BADGE_CLASS[plan]}`}>Active</Badge>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[12.5px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Expires: {formatDate(planExpiresAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {daysRemaining > 0 ? `${daysRemaining} days left` : "Expired"}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="font-display text-[22px] font-semibold">
                {formatCurrency(planPrices[plan] ?? 0)}
              </div>
              <div className="text-[11px] text-muted-foreground">per month</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Pending Change Banner ── */}
      {pendingPlan && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-200/60 bg-amber-50/60 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-[13px]">
              <p className="font-semibold text-amber-900">Plan change scheduled at renewal</p>
              <p className="mt-0.5 text-amber-800/80">
                Your current <strong>{plan}</strong> plan will remain active until{" "}
                <strong>{formatDate(planExpiresAt)}</strong>. The <strong>{pendingPlan}</strong>{" "}
                plan will automatically start from{" "}
                <strong>
                  {planExpiresAt
                    ? formatDate(
                        new Date(new Date(planExpiresAt).getTime() + 86_400_000).toISOString(),
                      )
                    : "next cycle"}
                </strong>
                .
              </p>
              <p className="mt-1 text-[11px] text-amber-700/70">
                Requested on {formatDate(pendingPlanAt)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={handleCancelScheduled}
            disabled={cancelLoading}
          >
            {cancelLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <X className="h-3.5 w-3.5 mr-1" />
            )}
            Cancel
          </Button>
        </div>
      )}

      {/* ── Plan Cards ── */}
      <div>
        <h2 className="mb-3 font-display text-[16px] font-semibold">Choose a plan</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((tier) => {
            const isCurrent = isCurrentPlan(tier);
            const isUp = isUpgrade(tier);
            const isDown = PLAN_ORDER.indexOf(tier) < PLAN_ORDER.indexOf(plan);
            const upCost = upgradeCostPreview[tier];
            const hasPending = !!pendingPlan;

            return (
              <Card
                key={tier}
                className={`relative flex flex-col border-2 transition-all ${
                  isCurrent ? "border-primary shadow-md" : "border-border hover:border-primary/40"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-4">
                    <span className="rounded-full border border-primary bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      Current Plan
                    </span>
                  </div>
                )}

                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-[16px]">{tier}</CardTitle>
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${PLAN_COLORS[tier]} text-white`}
                    >
                      <Crown className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="font-display text-[22px] font-semibold">
                      {formatCurrency(planPrices[tier] ?? 0)}
                    </span>
                    <span className="ml-1 text-[12px] text-muted-foreground">/ month</span>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4">
                  {/* Features */}
                  <ul className="flex-1 space-y-1.5">
                    {PLAN_FEATURES[tier].map((f) => (
                      <li key={f.label} className="flex items-start gap-2 text-[12.5px]">
                        <CheckCircle2
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            f.included ? "text-success" : "text-muted-foreground/30"
                          }`}
                        />
                        <span
                          className={
                            f.included ? "text-foreground" : "text-muted-foreground/50 line-through"
                          }
                        >
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Action buttons */}
                  {isCurrent ? (
                    <div className="space-y-2">
                      {daysRemaining <= 0 ? (
                        <Button
                          className="w-full gap-1.5"
                          size="sm"
                          onClick={() => setUpgradeTarget(tier)}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Renew Now ({formatCurrency(planPrices[tier] ?? 0)})
                        </Button>
                      ) : (
                        <div className="rounded-lg bg-primary/5 py-2 text-center text-[12px] font-medium text-primary">
                          Your current plan
                        </div>
                      )}
                    </div>
                  ) : isUp ? (
                    <div className="space-y-2">
                      {/* Immediate upgrade */}
                      {hasPending ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11.5px] text-amber-800">
                          <AlertCircle className="inline h-3.5 w-3.5 mr-1" />
                          Plan change already scheduled
                        </div>
                      ) : (
                        <Button
                          className="w-full gap-1.5"
                          size="sm"
                          onClick={() => setUpgradeTarget(tier)}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {daysRemaining <= 0 ? "Renew & Upgrade" : "Upgrade Now"}
                          {daysRemaining > 0 && upCost !== undefined && (
                            <span className="ml-1 text-[10px] opacity-80">
                              ({formatCurrency(upCost)} pro-rated)
                            </span>
                          )}
                        </Button>
                      )}
                      {/* Upgrade at renewal */}
                      {!hasPending && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5 text-[12px]"
                          onClick={() => setRenewalTarget(tier)}
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          Upgrade at Renewal
                        </Button>
                      )}
                    </div>
                  ) : isDown ? (
                    <div className="space-y-2">
                      {hasPending && pendingPlan === tier ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11.5px] text-amber-800">
                          <Clock className="inline h-3.5 w-3.5 mr-1" />
                          Scheduled for renewal
                        </div>
                      ) : hasPending ? (
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11.5px] text-slate-700">
                          <PhoneCall className="h-3.5 w-3.5 shrink-0" />
                          <span>A change is scheduled. Contact admin to modify.</span>
                        </div>
                      ) : daysRemaining <= 0 ? (
                        <Button
                          className="w-full gap-1.5"
                          size="sm"
                          onClick={() => setUpgradeTarget(tier)}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Renew & Downgrade ({formatCurrency(planPrices[tier] ?? 0)})
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5 text-[12px] text-muted-foreground"
                          onClick={() => setRenewalTarget(tier)}
                        >
                          <TrendingDown className="h-3.5 w-3.5" />
                          Downgrade at Renewal
                        </Button>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Plan History ── */}
      <Card className="border-border bg-card shadow-soft">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setHistoryOpen((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-[15px]">Plan history</CardTitle>
            {historyOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {historyOpen && (
          <CardContent className="px-0 pb-2">
            {historyLoading ? (
              <div className="px-6 py-4 text-[13px] text-muted-foreground">Loading…</div>
            ) : history.length === 0 ? (
              <div className="px-6 py-4 text-[13px] text-muted-foreground">
                No plan changes recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-2 text-left font-medium">Date</th>
                      <th className="px-4 py-2 text-left font-medium">Change</th>
                      <th className="px-4 py-2 text-left font-medium">Type</th>
                      <th className="px-4 py-2 text-left font-medium">Amount</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-6 py-2.5 text-muted-foreground">
                          {formatDate(row.requestedAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-1">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PLAN_BADGE_CLASS[row.fromPlan as PlanTier] ?? "bg-muted text-muted-foreground"}`}
                            >
                              {row.fromPlan}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PLAN_BADGE_CLASS[row.toPlan as PlanTier] ?? "bg-muted text-muted-foreground"}`}
                            >
                              {row.toPlan}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {changeTypeLabel(row.changeType)}
                        </td>
                        <td className="px-4 py-2.5 font-medium">
                          {row.amountPaid != null && row.amountPaid > 0
                            ? formatCurrency(row.amountPaid)
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              row.paymentStatus === "Paid"
                                ? "bg-success/10 text-success"
                                : row.paymentStatus === "Pending"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {row.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Modals ── */}
      {upgradeTarget && (
        <PaymentModal
          open={!!upgradeTarget}
          onClose={() => setUpgradeTarget(null)}
          targetPlan={upgradeTarget}
          currentPlan={plan}
          daysRemaining={daysRemaining}
          cost={
            daysRemaining <= 0
              ? planPrices[upgradeTarget]
              : (upgradeCostPreview[upgradeTarget] ?? 0)
          }
          planPrices={planPrices}
          onSuccess={handleUpgradeSuccess}
        />
      )}

      {renewalTarget && (
        <RenewalDialog
          open={!!renewalTarget}
          onClose={() => setRenewalTarget(null)}
          targetPlan={renewalTarget}
          currentPlan={plan}
          planExpiresAt={planExpiresAt}
          isDowngrade={PLAN_ORDER.indexOf(renewalTarget) < PLAN_ORDER.indexOf(plan)}
          planPrices={planPrices}
          onSuccess={() => {
            refreshPlan();
            setRenewalTarget(null);
          }}
        />
      )}
    </div>
  );
}
