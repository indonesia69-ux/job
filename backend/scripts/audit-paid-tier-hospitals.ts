import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { getJobLimit, getSearchLimit, PLAN_PRICES } from '../src/config/plans';

async function main() {
  const now = new Date();
  const paidHospitals = await prisma.hospital.findMany({
    where: {
      onboardingPlan: { in: ['Pro', 'Premium'] },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      onboardingPlan: true,
      planExpiresAt: true,
      maxRecruiters: true,
      onboardingStatus: true,
      approvedAt: true,
      planChangeLogs: { orderBy: { effectiveAt: 'asc' } },
      paymentOrders: true,
      users: {
        where: { role: 'RECRUITER', deletedAt: null },
        select: {
          email: true,
          jobsPostedThisMonth: true,
          premiumSearchesThisMonth: true,
        },
      },
      _count: { select: { jobs: true, users: { where: { role: 'RECRUITER', deletedAt: null } } } },
    },
    orderBy: { name: 'asc' },
  });

  const rows = paidHospitals.map((h) => {
    const paidLogs = h.planChangeLogs.filter((l) => (l.amountPaid ?? 0) > 0);
    const paidOrders = h.paymentOrders.filter((o) => o.status === 'PAID' && o.amount > 0);
    const waivedOrAdmin = h.planChangeLogs.filter(
      (l) => l.paymentStatus === 'Waived' || l.changeType === 'immediate_upgrade',
    );
    const jobsThisMonth = h.users.reduce((s, u) => s + u.jobsPostedThisMonth, 0);
    const searchesThisMonth = h.users.reduce((s, u) => s + u.premiumSearchesThisMonth, 0);
    const tierPrice = PLAN_PRICES[h.onboardingPlan as keyof typeof PLAN_PRICES] ?? 0;

    return {
      id: h.id,
      name: h.name,
      status: h.onboardingStatus,
      currentPlan: h.onboardingPlan,
      planExpiresAt: h.planExpiresAt,
      planActive: h.planExpiresAt ? h.planExpiresAt > now : null,
      maxRecruiters: h.maxRecruiters,
      recruiterCount: h._count.users,
      totalJobs: h._count.jobs,
      jobsPostedThisMonth: jobsThisMonth,
      jobLimit: getJobLimit(h.onboardingPlan),
      basicJobLimit: getJobLimit('Basic'),
      premiumSearchesThisMonth: searchesThisMonth,
      searchLimit: getSearchLimit(h.onboardingPlan),
      basicSearchLimit: getSearchLimit('Basic'),
      monthlyListPriceInr: tierPrice,
      totalPaidViaLogsInr: paidLogs.reduce((s, l) => s + (l.amountPaid ?? 0), 0),
      totalPaidViaOrdersInr: paidOrders.reduce((s, o) => s + o.amount, 0),
      everPaid: paidLogs.length > 0 || paidOrders.length > 0,
      planHistory: h.planChangeLogs.map((l) => ({
        changeType: l.changeType,
        fromPlan: l.fromPlan,
        toPlan: l.toPlan,
        amountPaid: l.amountPaid,
        paymentStatus: l.paymentStatus,
        paymentRef: l.paymentRef,
        effectiveAt: l.effectiveAt,
        note: l.note,
      })),
      howReachedPaidTier:
        paidLogs.length || paidOrders.length
          ? 'paid'
          : waivedOrAdmin.some((l) => l.paymentStatus === 'Waived')
            ? 'admin_waived_or_approval'
            : 'unknown_no_payment_record',
    };
  });

  console.log(JSON.stringify({ queriedAt: now.toISOString(), count: rows.length, hospitals: rows }, null, 2));
}

main().finally(() => prisma.$disconnect());
