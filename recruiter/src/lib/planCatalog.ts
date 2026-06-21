import { apiBase } from "@/lib/api";

export type PlanTier = "Basic" | "Pro" | "Premium";

export type PlanConfigPublic = {
  id: PlanTier;
  displayName: string;
  validityDays: number;
  activeJobLimit: number;
  recruiterAccountLimit: number;
  premiumSearchLimit: number;
  priceInRupees: number;
  isLaunchOffer: boolean;
  autoRenewal: boolean;
};

export type PlanCatalogResponse = {
  billingCycleDays: number;
  planOrder: PlanTier[];
  plans: PlanConfigPublic[];
  planPrices: Record<PlanTier, number>;
};

/** Mirrors backend config/plans.ts — used only until /api/plan/catalog loads. */
export const FALLBACK_PLAN_CATALOG: PlanCatalogResponse = {
  billingCycleDays: 30,
  planOrder: ["Basic", "Pro", "Premium"],
  plans: [
    {
      id: "Basic",
      displayName: "Basic",
      validityDays: 18,
      activeJobLimit: 4,
      recruiterAccountLimit: 2,
      premiumSearchLimit: 30,
      priceInRupees: 0,
      isLaunchOffer: true,
      autoRenewal: true,
    },
    {
      id: "Pro",
      displayName: "Pro",
      validityDays: 23,
      activeJobLimit: 8,
      recruiterAccountLimit: 2,
      premiumSearchLimit: 50,
      priceInRupees: 799,
      isLaunchOffer: false,
      autoRenewal: true,
    },
    {
      id: "Premium",
      displayName: "Premium",
      validityDays: 30,
      activeJobLimit: 10,
      recruiterAccountLimit: 5,
      premiumSearchLimit: 100,
      priceInRupees: 2499,
      isLaunchOffer: false,
      autoRenewal: true,
    },
  ],
  planPrices: { Basic: 0, Pro: 799, Premium: 2499 },
};

let catalogPromise: Promise<PlanCatalogResponse> | null = null;

export async function fetchPlanCatalog(): Promise<PlanCatalogResponse> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const res = await fetch(`${apiBase()}/api/plan/catalog`);
      if (!res.ok) throw new Error("Failed to load plan catalog");
      return res.json() as Promise<PlanCatalogResponse>;
    })().catch((err) => {
      catalogPromise = null;
      throw err;
    });
  }
  return catalogPromise;
}

export function getPlanFromCatalog(catalog: PlanCatalogResponse, tier: PlanTier): PlanConfigPublic {
  return catalog.plans.find((p) => p.id === tier) ?? catalog.plans[0];
}

export function formatPlanPrice(priceInRupees: number): string {
  if (priceInRupees === 0) return "Free";
  return `₹${priceInRupees.toLocaleString("en-IN")}/mo`;
}

export type PlanFeature = { label: string; included: boolean };

export function buildPlanFeatures(plan: PlanConfigPublic, tier: PlanTier): PlanFeature[] {
  const isBasic = tier === "Basic";
  const isPro = tier === "Pro";
  const isPremium = tier === "Premium";

  return [
    {
      label: `Up to ${plan.activeJobLimit} job post${plan.activeJobLimit === 1 ? "" : "s"} / month`,
      included: true,
    },
    { label: `${plan.premiumSearchLimit} premium candidate searches / month`, included: true },
    {
      label: `Up to ${plan.recruiterAccountLimit} recruiter${plan.recruiterAccountLimit === 1 ? "" : "s"}`,
      included: true,
    },
    {
      label: `Job visibility (${plan.validityDays} days)`,
      included: true,
    },
    { label: "Priority candidate matching", included: isPro || isPremium },
    { label: "Extended job visibility (30 days)", included: isPremium },
    { label: "Dedicated support", included: isPremium },
    { label: "Advanced analytics", included: isPremium },
    ...(isBasic ? [{ label: "Unlimited recruiters", included: false }] : []),
  ];
}
