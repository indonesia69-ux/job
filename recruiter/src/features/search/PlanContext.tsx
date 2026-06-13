import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiBase } from "@/lib/api";
import { authHeader } from "@/store/authStore";

export type PlanTier = "Basic" | "Pro" | "Premium";

export const PLAN_QUOTA: Record<PlanTier, number> = {
  Basic: 30,
  Pro: 50,
  Premium: 100,
};

export const PLAN_JOB_POSTS: Record<PlanTier, number> = {
  Basic: 5,
  Pro: 10,
  Premium: 15,
};

// JOB_VALIDITY_DAYS is now dynamic per user

type Ctx = {
  plan: PlanTier;
  setPlan: (p: PlanTier) => void;
  used: number;
  quota: number;
  remaining: number;
  jobPostsQuota: number;
  jobPostsUsed: number;
  jobPostsRemaining: number;
  jobValidityDays: number;
  isLocked: boolean;
  consume: () => boolean;
  // ── New plan billing fields ────────────────────────────────────────────────
  planExpiresAt: string | null;
  pendingPlan: PlanTier | null;
  pendingPlanAt: string | null;
  daysRemaining: number;
  planPrices: Record<string, number>;
  upgradeCostPreview: Record<string, number>;
  refreshPlan: () => void;
};

const PlanCtx = createContext<Ctx | null>(null);

const DEFAULT_PRICES: Record<string, number> = {
  Basic: 5000,
  Pro: 7500,
  Premium: 10000,
};

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanTier>("Basic");
  const [used, setUsed] = useState(0);
  const [jobPostsUsed, setJobPostsUsed] = useState(0);
  const [jobValidityDays, setJobValidityDays] = useState(30);
  const [isLocked, setIsLocked] = useState(false);

  // ── New billing state ──────────────────────────────────────────────────────
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PlanTier | null>(null);
  const [pendingPlanAt, setPendingPlanAt] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [planPrices, setPlanPrices] = useState<Record<string, number>>(DEFAULT_PRICES);
  const [upgradeCostPreview, setUpgradeCostPreview] = useState<Record<string, number>>({});

  const fetchPlanData = useCallback(async () => {
    try {
      // Fetch base user info
      const authRes = await fetch(`${apiBase()}/api/auth/me`, { headers: authHeader() });
      if (authRes.ok) {
        const data = await authRes.json();
        if (data.user) {
          setPlan((data.user.plan as PlanTier) || "Basic");
          setUsed(data.user.premiumSearchesThisMonth || 0);
          setJobPostsUsed(data.user.jobsPostedThisMonth || 0);
          if (data.user.jobValidityDays !== undefined) {
            setJobValidityDays(data.user.jobValidityDays);
          }
          if (data.user.isLocked !== undefined) {
            setIsLocked(data.user.isLocked);
          }
        }
      }

      // Fetch extended billing info
      const planRes = await fetch(`${apiBase()}/api/plan/current`, { headers: authHeader() });
      if (planRes.ok) {
        const pdata = await planRes.json();
        setPlanExpiresAt(pdata.planExpiresAt ?? null);
        setPendingPlan((pdata.pendingPlan as PlanTier) ?? null);
        setPendingPlanAt(pdata.pendingPlanAt ?? null);
        setDaysRemaining(pdata.daysRemaining ?? 0);
        if (pdata.planPrices) setPlanPrices(pdata.planPrices);
        if (pdata.upgradeCostPreview) setUpgradeCostPreview(pdata.upgradeCostPreview);
      }
    } catch {
      // Plan metadata is non-critical for the search experience.
    }
  }, []);

  useEffect(() => {
    void fetchPlanData();
  }, [fetchPlanData]);

  const value = useMemo<Ctx>(() => {
    const quota = PLAN_QUOTA[plan];
    const jobPostsQuota = PLAN_JOB_POSTS[plan];
    return {
      plan,
      setPlan: (p) => setPlan(p),
      used,
      quota,
      remaining: Math.max(0, quota - used),
      jobPostsQuota,
      jobPostsUsed,
      jobPostsRemaining: Math.max(0, jobPostsQuota - jobPostsUsed),
      jobValidityDays,
      isLocked,
      consume: () => {
        if (used >= quota || isLocked) return false;
        setUsed((u) => u + 1);
        return true;
      },
      // Billing fields
      planExpiresAt,
      pendingPlan,
      pendingPlanAt,
      daysRemaining,
      planPrices,
      upgradeCostPreview,
      refreshPlan: () => void fetchPlanData(),
    };
  }, [
    plan,
    used,
    jobPostsUsed,
    jobValidityDays,
    isLocked,
    planExpiresAt,
    pendingPlan,
    pendingPlanAt,
    daysRemaining,
    planPrices,
    upgradeCostPreview,
    fetchPlanData,
  ]);

  return <PlanCtx.Provider value={value}>{children}</PlanCtx.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanCtx);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}
