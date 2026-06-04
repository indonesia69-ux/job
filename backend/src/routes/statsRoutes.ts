import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/stats
router.get('/', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user!.hospitalId;
    if (!hospitalId) {
      res.json({ activeJobs: 0, totalApplicants: 0, newApplicants: 0, shortlisted: 0 });
      return;
    }
    const jobs = await prisma.job.findMany({
      where: { hospitalId },
      include: { applications: true },
    });
    const activeJobs = jobs.filter((j) => j.status === 'Active').length;
    let totalApplicants = 0;
    let newApplicants = 0;
    let shortlisted = 0;
    jobs.forEach((j) => {
      j.applications.forEach((a) => {
        totalApplicants++;
        if (a.status === 'New') newApplicants++;
        if (a.status === 'Shortlisted') shortlisted++;
      });
    });
    res.json({ activeJobs, totalApplicants, newApplicants, shortlisted });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
