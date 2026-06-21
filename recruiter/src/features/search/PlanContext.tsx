import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiBase, apiFetch } from "@/lib/api";
import { authHeader } from "@/store/authStore";
import {
  fetchPlanCatalog,
  getPlanFromCatalog,
  FALLBACK_PLAN_CATALOG,
  type PlanTier,
  type PlanCatalogResponse,
} from "@/lib/planCatalog";

export type { PlanTier };

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
  isPlanSuspended: boolean;
  consume: () => boolean;
  planCatalog: PlanCatalogResponse;
  billingCycleDays: number;
  planExpiresAt: string | null;
  pendingPlan: PlanTier | null;
  pendingPlanAt: string | null;
  daysRemaining: number;
  planPrices: Record<string, number>;
  upgradeCostPreview: Record<string, number>;
  refreshPlan: () => void;
};

const PlanCtx = createContext<Ctx | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [planCatalog, setPlanCatalog] = useState<PlanCatalogResponse>(FALLBACK_PLAN_CATALOG);
  const [plan, setPlan] = useState<PlanTier>("Basic");
  const [used, setUsed] = useState(0);
  const [jobPostsUsed, setJobPostsUsed] = useState(0);
  const [jobValidityDays, setJobValidityDays] = useState(30);
  const [isLocked, setIsLocked] = useState(false);
  const [isPlanSuspended, setIsPlanSuspended] = useState(false);

  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PlanTier | null>(null);
  const [pendingPlanAt, setPendingPlanAt] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [planPrices, setPlanPrices] = useState<Record<string, number>>(
    FALLBACK_PLAN_CATALOG.planPrices,
  );
  const [upgradeCostPreview, setUpgradeCostPreview] = useState<Record<string, number>>({});

  useEffect(() => {
    void fetchPlanCatalog()
      .then((catalog) => {
        setPlanCatalog(catalog);
        setPlanPrices(catalog.planPrices);
      })
      .catch(() => {
        // Keep FALLBACK_PLAN_CATALOG values on failure.
      });
  }, []);

  const fetchPlanData = useCallback(async () => {
    try {
      const authRes = await apiFetch(`${apiBase()}/api/auth/me`, { headers: authHeader() });
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
          if (data.user.isPlanSuspended !== undefined) {
            setIsPlanSuspended(data.user.isPlanSuspended);
          }
        }
      }

      const planRes = await apiFetch(`${apiBase()}/api/plan/current`, { headers: authHeader() });
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
    const currentPlan = getPlanFromCatalog(planCatalog, plan);
    const quota = currentPlan.premiumSearchLimit;
    const jobPostsQuota = currentPlan.activeJobLimit;
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
      isPlanSuspended,
      consume: () => {
        if (used >= quota || isLocked || isPlanSuspended) return false;
        setUsed((u) => u + 1);
        return true;
      },
      planCatalog,
      billingCycleDays: planCatalog.billingCycleDays,
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
    isPlanSuspended,
    planCatalog,
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
