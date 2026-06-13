import logger from '../../lib/logger';
import { Router, Response } from 'express';
import prisma from '../../lib/prisma';
import { requireAdmin, AdminAuthRequest } from '../../middleware/auth';

const router = Router();

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const sixMonthsAgo = new Date(new Date().setMonth(new Date().getMonth() - 5));

    const [
      totalHospitals,
      totalRecruiters,
      totalCandidates,
      totalJobs,
      activeSubscriptions,
      interviewsScheduled,
      offersReleased,
      candidatesJoined,
      pendingVerifications,
      revenueResult,
      flaggedJobs,
      flaggedApplications,
      recentJobs,
      recentCandidates,
      recentApplications,
      recentHospitals,
      recentRevenue,
      jobDistribution,
      recentActivityLogs
    ] = await Promise.all([
      prisma.hospital.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: 'RECRUITER', deletedAt: null } }),
      prisma.candidate.count({ where: { deletedAt: null } }),
      prisma.job.count({ where: { status: 'Active' } }),
      prisma.hospital.count({ where: { deletedAt: null, isSuspended: false, planExpiresAt: { gt: new Date() } } }),
      prisma.application.count({ where: { status: 'InterviewScheduled' } }),
      prisma.application.count({ where: { status: { in: ['OfferSent', 'OfferAccepted', 'OfferRejected'] } } }),
      prisma.application.count({ where: { status: 'Joined' } }),
      prisma.hospital.count({ where: { onboardingStatus: 'Pending', deletedAt: null } }),
      prisma.planChangeLog.aggregate({ _sum: { amountPaid: true }, where: { paymentStatus: 'Paid' } }),
      prisma.job.findMany({ where: { isFlagged: true }, include: { hospital: true } }),
      prisma.application.findMany({ where: { isFlagged: true }, include: { job: true, candidate: true } }),
      // Fetch recent records for trend calculation
      prisma.job.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
      prisma.candidate.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
      prisma.application.findMany({ where: { appliedOn: { gte: sixMonthsAgo } }, select: { appliedOn: true } }),
      prisma.hospital.findMany({ where: { submittedAt: { gte: sixMonthsAgo }, deletedAt: null }, select: { submittedAt: true } }),
      prisma.planChangeLog.findMany({ where: { paymentStatus: 'Paid', effectiveAt: { gte: sixMonthsAgo } }, select: { effectiveAt: true, amountPaid: true } }),
      prisma.job.groupBy({ by: ['category'], _count: { id: true } }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, entityType: true, entityId: true, action: true, actorRole: true, createdAt: true }
      }),
    ]);

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() };
    });

    const monthlyTrend = months.map(m => {
      return {
        name: m.label,
        jobs: recentJobs.filter(j => j.createdAt.getMonth() === m.month && j.createdAt.getFullYear() === m.year).length,
        applications: recentApplications.filter(a => a.appliedOn.getMonth() === m.month && a.appliedOn.getFullYear() === m.year).length,
      };
    });

    const userGrowth = months.map(m => {
      return {
        name: m.label,
        candidates: recentCandidates.filter(c => c.createdAt.getMonth() === m.month && c.createdAt.getFullYear() === m.year).length,
        hospitals: recentHospitals.filter(h => h.submittedAt && h.submittedAt.getMonth() === m.month && h.submittedAt.getFullYear() === m.year).length,
      };
    });

    const revenueTrend = months.map(m => {
      const rev = recentRevenue.filter(r => r.effectiveAt.getMonth() === m.month && r.effectiveAt.getFullYear() === m.year).reduce((sum, r) => sum + (r.amountPaid || 0), 0);
      return { name: m.label, revenue: rev };
    });

    const roleDistribution = jobDistribution.map(d => ({ name: d.category || 'Other', value: d._count.id }));

    res.json({
      kpiData: {
        totalHospitals,
        totalRecruiters,
        totalCandidates,
        totalJobs,
        activeSubscriptions,
        interviewsScheduled,
        offersReleased,
        candidatesJoined,
        pendingVerifications,
        totalRevenue: revenueResult._sum.amountPaid || 0,
      },
      flaggedItems: [
        ...flaggedJobs.map(j => ({ id: j.id, type: 'job', text: `Job flagged: ${j.role} at ${j.hospital?.name || 'Unknown'}`, time: j.createdAt })),
        ...flaggedApplications.map(a => ({ id: a.id, type: 'application', text: `Application flagged: ${a.candidate?.name} for ${a.job?.role}`, time: a.appliedOn }))
      ],
      activityFeed: recentActivityLogs.map(l => ({
        id: l.id,
        type: l.entityType === 'job' ? 'job' : l.entityType === 'hospital' ? 'registration' : l.actorRole === 'ADMIN' ? 'verification' : 'application',
        text: `${l.entityType} ${l.action}`,
        time: l.createdAt,
      })),
      monthlyTrend,
      userGrowth,
      roleDistribution,
      revenueTrend
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;