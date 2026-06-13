/**
 * planBilling.ts
 * Pure utility functions for plan pricing and pro-rated billing calculations.
 * No database calls — safe to import anywhere.
 */

// ─── Plan catalogue ──────────────────────────────────────────────────────────

/** Monthly price in INR for each plan tier. */
export const PLAN_PRICES: Record<string, number> = {
  Basic:   5_000,
  Pro:     7_500,
  Premium: 10_000,
};

/** Canonical order — index increases with tier. */
export const PLAN_ORDER: string[] = ['Basic', 'Pro', 'Premium'];

// ─── Direction helpers ────────────────────────────────────────────────────────

export function isUpgrade(fromPlan: string, toPlan: string): boolean {
  return PLAN_ORDER.indexOf(toPlan) > PLAN_ORDER.indexOf(fromPlan);
}

export function isDowngrade(fromPlan: string, toPlan: string): boolean {
  return PLAN_ORDER.indexOf(toPlan) < PLAN_ORDER.indexOf(fromPlan);
}

export function isSamePlan(fromPlan: string, toPlan: string): boolean {
  return fromPlan === toPlan;
}

// ─── Pro-ration helpers ────────────────────────────────────────────────────────

/**
 * Days remaining in the current billing cycle.
 * Returns 0 if `planExpiresAt` is null / already passed.
 */
export function daysRemainingInCycle(planExpiresAt: Date | null | undefined): number {
  if (!planExpiresAt) return 0;
  const now = new Date();
  const diffMs = planExpiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Compute the pro-rated upgrade cost.
 *
 * Formula: (newPlanPrice - currentPlanPrice) × (daysRemaining / cycleDays)
 *
 * Returns 0 for downgrades (no charge) or same-plan.
 */
export function computeUpgradeCost(
  currentPlan: string,
  newPlan: string,
  daysRemaining: number,
  cycleDays = 30,
): number {
  const priceDiff = (PLAN_PRICES[newPlan] ?? 0) - (PLAN_PRICES[currentPlan] ?? 0);
  if (priceDiff <= 0) return 0;
  return Math.round((priceDiff * daysRemaining) / cycleDays);
}

/**
 * Compute the pro-rated upgrade cost preview for ALL higher plans.
 * Useful for the "Choose Plan" UI.
 */
export function computeUpgradeCostPreview(
  currentPlan: string,
  daysRemaining: number,
): Record<string, number> {
  const preview: Record<string, number> = {};
  for (const tier of PLAN_ORDER) {
    if (isUpgrade(currentPlan, tier)) {
      preview[tier] = computeUpgradeCost(currentPlan, tier, daysRemaining);
    }
  }
  return preview;
}

/**
 * Return the date that is `days` days from now (UTC midnight).
 */
export function addDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
