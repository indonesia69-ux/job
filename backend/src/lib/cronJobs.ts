import cron from 'node-cron';
import prisma from './prisma';
import logger from './logger';

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
              status: { in: ['New', 'Reviewed'] },
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

  // Run daily at midnight to check for hospital plan expirations
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Running cron job: Checking hospital plan expirations...');
      const hospitals = await prisma.hospital.findMany({
        where: { onboardingStatus: 'Approved' }
      });

      // We need getHospitalValidity, so let's import it or just inline the logic here since we didn't import it in cronJobs.ts
      for (const hospital of hospitals) {
        const start = hospital.approvedAt || hospital.submittedAt;
        if (!start) continue;

        const expirationDate = new Date(start);
        expirationDate.setDate(expirationDate.getDate() + 30);
        
        const now = new Date();
        const diffMs = expirationDate.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        if (daysRemaining === 5 || daysRemaining === 3 || daysRemaining === 1) {
          const recruiters = await prisma.user.findMany({
            where: { hospitalId: hospital.id, role: 'RECRUITER' }
          });

          for (const user of recruiters) {
            const title = 'Plan Expiring Soon';
            const message = `Your recruiter account plan will expire in ${daysRemaining} day(s). Please contact support to renew your plan.`;
            
            // Prevent duplicate notifications for the same day count
            const existing = await prisma.inAppNotification.findFirst({
              where: {
                userId: user.id,
                title,
                message
              }
            });

            if (!existing) {
              await prisma.inAppNotification.create({
                data: {
                  userId: user.id,
                  title,
                  message,
                  link: '/settings'
                }
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
