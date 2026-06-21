/**
 * Read-only audit: pending paid upgrades + historical free cron upgrades.
 * Usage: npx tsx scripts/audit-pending-plan-exposure.ts
 */
import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { getJobLimit, getSearchLimit } from '../src/config/plans';

const PAID_TIERS = ['Pro', 'Premium'] as const;

async function main() {
  const now = new Date();

  // ── Q1: pending paid upgrade, not yet applied ─────────────────────────────
  const pendingScheduled = await prisma.hospital.findMany({
    where: {
      deletedAt: null,
      pendingPlan: { in: [...PAID_TIERS] },
      planExpiresAt: { gt: now },
    },
    select: {
      id: true,
      name: true,
      onboardingPlan: true,
      pendingPlan: true,
      pendingPlanAt: true,
      planExpiresAt: true,
      onboardingStatus: true,
    },
    orderBy: { planExpiresAt: 'asc' },
  });

  // ── Q2: cron-applied free paid upgrades (audit trail) ─────────────────────
  const suspiciousLogs = await prisma.planChangeLog.findMany({
    where: {
      toPlan: { in: [...PAID_TIERS] },
      changeType: { in: ['renewal', 'scheduled_upgrade'] },
      paymentStatus: 'Paid',
      OR: [{ amountPaid: 0 }, { amountPaid: null }],
    },
    orderBy: { effectiveAt: 'desc' },
  });

  const hospitalIdsFromLogs = [...new Set(suspiciousLogs.map((l) => l.hospitalId))];

  const exposedHospitals = await prisma.hospital.findMany({
    where: { id: { in: hospitalIdsFromLogs } },
    select: {
      id: true,
      name: true,
      onboardingPlan: true,
      planExpiresAt: true,
      maxRecruiters: true,
      onboardingStatus: true,
      isSuspended: true,
      deletedAt: true,
      users: {
        where: { role: 'RECRUITER', deletedAt: null },
        select: {
          id: true,
          email: true,
          jobsPostedThisMonth: true,
          premiumSearchesThisMonth: true,
        },
      },
      paymentOrders: {
        where: { status: 'PAID' },
        select: { amount: true, planRequested: true, createdAt: true },
      },
      planChangeLogs: {
        where: {
          paymentStatus: 'Paid',
          amountPaid: { gt: 0 },
        },
        select: { amountPaid: true, toPlan: true, changeType: true, effectiveAt: true },
      },
      jobs: {
        where: { status: { in: ['Active', 'Draft'] } },
        select: { id: true, status: true },
      },
      _count: {
        select: {
          jobs: true,
          users: { where: { role: 'RECRUITER', deletedAt: null } },
        },
      },
    },
  });

  const exposedDetails = exposedHospitals.map((h) => {
    const matchingLogs = suspiciousLogs.filter((l) => l.hospitalId === h.id);
    const totalJobsPostedThisMonth = h.users.reduce((s, u) => s + u.jobsPostedThisMonth, 0);
    const totalSearchesThisMonth = h.users.reduce((s, u) => s + u.premiumSearchesThisMonth, 0);
    const jobLimit = getJobLimit(h.onboardingPlan);
    const searchLimit = getSearchLimit(h.onboardingPlan);
    const basicJobLimit = getJobLimit('Basic');
    const basicSearchLimit = getSearchLimit('Basic');
    const lifetimePaidFromLogs =
      h.planChangeLogs.reduce((s, l) => s + (l.amountPaid ?? 0), 0);
    const lifetimePaidFromOrders = h.paymentOrders.reduce((s, o) => s + o.amount, 0);

    const usingPaidJobQuota = totalJobsPostedThisMonth > basicJobLimit;
    const usingPaidSearchQuota = totalSearchesThisMonth > basicSearchLimit;
    const usingPaidRecruiterSeats = h._count.users > 2; // Basic default max
    const onPaidTierNow = PAID_TIERS.includes(h.onboardingPlan as (typeof PAID_TIERS)[number]);

    return {
      hospitalId: h.id,
      name: h.name,
      onboardingStatus: h.onboardingStatus,
      isSuspended: h.isSuspended,
      deletedAt: h.deletedAt,
      currentPlan: h.onboardingPlan,
      planExpiresAt: h.planExpiresAt,
      maxRecruiters: h.maxRecruiters,
      recruiterCount: h._count.users,
      totalJobsAllTime: h._count.jobs,
      activeOrDraftJobs: h.jobs.length,
      jobsPostedThisMonth: totalJobsPostedThisMonth,
      jobLimitForCurrentPlan: jobLimit,
      basicJobLimit,
      premiumSearchesThisMonth: totalSearchesThisMonth,
      searchLimitForCurrentPlan: searchLimit,
      basicSearchLimit,
      lifetimePaidPlanChangeLogs: lifetimePaidFromLogs,
      lifetimePaidPaymentOrders: lifetimePaidFromOrders,
      anyRealPayment: lifetimePaidFromLogs > 0 || lifetimePaidFromOrders > 0,
      onPaidTierNow,
      usingPaidTierLimits:
        onPaidTierNow &&
        !lifetimePaidFromLogs &&
        !lifetimePaidFromOrders &&
        (usingPaidJobQuota || usingPaidSearchQuota || usingPaidRecruiterSeats || h.maxRecruiters > 2),
      suspiciousLogCount: matchingLogs.length,
      suspiciousLogs: matchingLogs.map((l) => ({
        id: l.id,
        fromPlan: l.fromPlan,
        toPlan: l.toPlan,
        changeType: l.changeType,
        amountPaid: l.amountPaid,
        paymentStatus: l.paymentStatus,
        effectiveAt: l.effectiveAt,
        note: l.note,
      })),
    };
  });

  const onPaidTierWithoutPayment = exposedDetails.filter(
    (h) => h.onPaidTierNow && !h.anyRealPayment,
  );
  const usingPaidLimitsWithoutPayment = exposedDetails.filter(
    (h) => h.onPaidTierNow && !h.anyRealPayment && h.usingPaidTierLimits,
  );

  console.log(
    JSON.stringify(
      {
        queriedAt: now.toISOString(),
        q1_pendingPaidUpgradeFutureExpiry: {
          count: pendingScheduled.length,
          hospitals: pendingScheduled,
        },
        q2_suspiciousPlanChangeLogs: {
          logEntryCount: suspiciousLogs.length,
          distinctHospitalCount: hospitalIdsFromLogs.length,
        },
        q3_exposure: {
          hospitalsOnPaidTierWithZeroPaymentHistory: onPaidTierWithoutPayment.length,
          hospitalsUsingPaidLimitsWithZeroPaymentHistory: usingPaidLimitsWithoutPayment.length,
          impliedUnpaidRevenueIfCurrentlyOnPro: onPaidTierWithoutPayment.filter(
            (h) => h.currentPlan === 'Pro',
          ).length,
          impliedUnpaidRevenueIfCurrentlyOnPremium: onPaidTierWithoutPayment.filter(
            (h) => h.currentPlan === 'Premium',
          ).length,
          hospitals: exposedDetails,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
