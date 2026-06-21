import { apiBase } from "@/lib/api";
import type { PlanTier } from "@/lib/admin-store";

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
