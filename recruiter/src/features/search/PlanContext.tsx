import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
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
};

const PlanCtx = createContext<Ctx | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanTier>("Basic");
  const [used, setUsed] = useState(0);
  const [jobPostsUsed, setJobPostsUsed] = useState(0);
  const [jobValidityDays, setJobValidityDays] = useState(30);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch(`${apiBase()}/api/auth/me`, { headers: authHeader() });
        if (res.ok) {
          const data = await res.json();
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
      } catch (err) {}
    }
    fetchPlan();
  }, []);

  const value = useMemo<Ctx>(() => {
    const quota = PLAN_QUOTA[plan];
    const jobPostsQuota = PLAN_JOB_POSTS[plan];
    return {
      plan,
      setPlan: (p) => {
        setPlan(p);
      },
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
    };
  }, [plan, used, jobPostsUsed, jobValidityDays, isLocked]);

  return <PlanCtx.Provider value={value}>{children}</PlanCtx.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanCtx);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}
