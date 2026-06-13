import cron from 'node-cron';
import prisma from './prisma';
import logger from './logger';
import { PLAN_RECRUITER_LIMITS } from './helpers';

export function initCronJobs() {
  // Run every hour to check for expired jobs
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running cron job: Checking for expired jobs...');
      const now = new Date();

      const expiredJobs = await prisma.job.findMany({
        where: {
          status: 'Active',
          visibilityEndsAt: { lte: now }
        }
      });

      if (expiredJobs.length > 0) {
        const jobIds = expiredJobs.map(j => j.id);

        const [, updatedJobs] = await prisma.$transaction([
          prisma.application.updateMany({
            where: {
              jobId: { in: jobIds },
              status: { in: ['Applied', 'Reviewed', 'Shortlisted', 'OnHold'] },
            },
            data: { status: 'JobClosed' },
          }),
          prisma.job.updateMany({
            where: { id: { in: jobIds } },
            data: { status: 'Closed' }
          }),
        ]);

        logger.info(`Cron job finished: Closed ${updatedJobs.count} expired job(s).`);
      }
    } catch (error) {
      logger.error('Error running expired jobs cron job: ' + error);
    }
  });

  // ─── Nightly: Apply pending plan changes at renewal ─────────────────────────
  // Runs at 00:05 every day. Finds hospitals whose planExpiresAt has passed
  // AND have a pendingPlan, then switches them over.
  cron.schedule('5 0 * * *', async () => {
    try {
      logger.info('Running cron job: Processing pending plan renewals...');
      const now = new Date();

      const hospitals = await prisma.hospital.findMany({
        where: {
          onboardingStatus: 'Approved',
          pendingPlan: { not: null },
          planExpiresAt: { lte: now },
        },
        include: { users: { where: { role: 'RECRUITER' } } },
      });

      for (const hospital of hospitals) {
        if (!hospital.pendingPlan) continue;

        const fromPlan = hospital.onboardingPlan;
        const toPlan   = hospital.pendingPlan;

        // New expiry = 30 days from now
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 30);
        newExpiresAt.setUTCHours(23, 59, 59, 999);

        const newMaxRecruiters = PLAN_RECRUITER_LIMITS[toPlan] ?? 3;

        await prisma.$transaction([
          prisma.hospital.update({
            where: { id: hospital.id },
            data: {
              onboardingPlan:  toPlan,
              planExpiresAt:   newExpiresAt,
              maxRecruiters:   newMaxRecruiters,
              pendingPlan:     null,
              pendingPlanAt:   null,
            },
          }),
          prisma.planChangeLog.create({
            data: {
              hospitalId:    hospital.id,
              fromPlan,
              toPlan,
              changeType:    'renewal',
              amountPaid:    0,
              effectiveAt:   now,
              paymentStatus: 'Paid',
              note:          `Automatic renewal: ${fromPlan} → ${toPlan}.`,
            },
          }),
        ]);

        // Notify all recruiters in this hospital
        if (hospital.users.length > 0) {
          await prisma.inAppNotification.createMany({
            data: hospital.users.map((u) => ({
              userId:  u.id,
              title:   'Plan Renewed',
              message: `Your hospital plan has been renewed as ${toPlan}. New cycle started.`,
              link:    '/settings',
            })),
          });
        }

        logger.info(`Plan renewal applied: ${hospital.name} — ${fromPlan} → ${toPlan}`);
      }

      logger.info(`Plan renewal cron finished: processed ${hospitals.length} hospital(s).`);
    } catch (error) {
      logger.error('Error running plan renewal cron job: ' + error);
    }
  });

  // ─── Nightly: Expiry warning notifications ───────────────────────────────────
  // Uses planExpiresAt when set (new billing), falls back to approvedAt+30 (legacy).
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Running cron job: Checking hospital plan expirations...');
      const hospitals = await prisma.hospital.findMany({
        where: { onboardingStatus: 'Approved' }
      });

      for (const hospital of hospitals) {
        // Prefer planExpiresAt; fall back to legacy approvedAt+30
        let expirationDate: Date | null = hospital.planExpiresAt ?? null;
        if (!expirationDate) {
          const start = hospital.approvedAt || hospital.submittedAt;
          if (!start) continue;
          expirationDate = new Date(start);
          expirationDate.setDate(expirationDate.getDate() + 30);
        }

        const now = new Date();
        const diffMs = expirationDate.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        if (daysRemaining === 5 || daysRemaining === 3 || daysRemaining === 1) {
          const recruiters = await prisma.user.findMany({
            where: { hospitalId: hospital.id, role: 'RECRUITER' }
          });

          for (const user of recruiters) {
            const title = 'Plan Expiring Soon';
            const message = `Your ${hospital.onboardingPlan} plan will expire in ${daysRemaining} day(s). Visit Settings to renew or upgrade.`;

            // Prevent duplicate notifications for the same day count
            const existing = await prisma.inAppNotification.findFirst({
              where: { userId: user.id, title, message }
            });

            if (!existing) {
              await prisma.inAppNotification.create({
                data: { userId: user.id, title, message, link: '/settings' }
              });
            }
          }
        }
      }
      logger.info('Cron job finished: Checked hospital plan expirations.');
    } catch (error) {
      logger.error('Error running expiration notifications cron job: ' + error);
    }
  });

  logger.info('Cron jobs initialized successfully.');
}
