import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const u = new URL(url.replace(/^postgresql:/, 'postgres:'));

  const [totalHospitals, totalPlanChangeLogs, onProOrPremium, anyPendingPlan, paidOrders] =
    await Promise.all([
      prisma.hospital.count(),
      prisma.planChangeLog.count(),
      prisma.hospital.count({ where: { onboardingPlan: { in: ['Pro', 'Premium'] } } }),
      prisma.hospital.count({ where: { pendingPlan: { not: null } } }),
      prisma.paymentOrder.count({ where: { status: 'PAID', amount: { gt: 0 } } }),
    ]);

  console.log(
    JSON.stringify(
      {
        dbHost: u.hostname,
        dbName: u.pathname.slice(1),
        sslMode: u.searchParams.get('sslmode'),
        totalHospitals,
        totalPlanChangeLogs,
        hospitalsOnProOrPremium: onProOrPremium,
        hospitalsWithAnyPendingPlan: anyPendingPlan,
        paidPaymentOrders: paidOrders,
      },
      null,
      2,
    ),
  );
}

main()
  .finally(() => prisma.$disconnect());
