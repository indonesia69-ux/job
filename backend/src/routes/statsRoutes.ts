import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

/** Return the Monday (week-start) for a given date, formatted as "MMM DD" */
function weekLabel(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// GET /api/dashboard/stats
router.get('/', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user!.hospitalId;
    if (!hospitalId) {
      res.json({ activeJobs: 0, totalApplicants: 0, newApplicants: 0, shortlisted: 0, chart: [] });
      return;
    }

    // ── Build an ordered list of the last 8 week labels (Mon–Sun) ──────────
    const now = new Date();
    const weeks: string[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i * 7);
      weeks.push(weekLabel(d));
    }
    const weekIndex = (date: Date) => {
      const label = weekLabel(date);
      const idx = weeks.indexOf(label);
      return idx; // -1 if older than 8 weeks
    };

    const eightWeeksAgo = new Date();
    eightWeeksAgo.setUTCDate(eightWeeksAgo.getUTCDate() - 56);

    const jobs = await prisma.job.findMany({
      where: { hospitalId },
      include: {
        applications: {
          where: { appliedOn: { gte: eightWeeksAgo } },
        },
      },
    });

    const activeJobs = jobs.filter((j) => j.status === 'Active').length;
    let totalApplicants = 0;
    let newApplicants = 0;
    let shortlisted = 0;

    // Initialise per-week counters
    const jobsPerWeek: Record<string, number> = {};
    const appsPerWeek: Record<string, number> = {};
    weeks.forEach((w) => { jobsPerWeek[w] = 0; appsPerWeek[w] = 0; });

    jobs.forEach((j) => {
      // Count job in its posted week
      if (j.postedOn && j.postedOn >= eightWeeksAgo) {
        const idx = weekIndex(j.postedOn);
        if (idx !== -1) jobsPerWeek[weeks[idx]]++;
      } else if (j.createdAt >= eightWeeksAgo) {
        const idx = weekIndex(j.createdAt);
        if (idx !== -1) jobsPerWeek[weeks[idx]]++;
      }

      j.applications.forEach((a) => {
        totalApplicants++;
        if (a.status === 'New') newApplicants++;
        if (a.status === 'Shortlisted') shortlisted++;

        const idx = weekIndex(a.appliedOn);
        if (idx !== -1) appsPerWeek[weeks[idx]]++;
      });
    });

    const chart = weeks.map((w) => ({
      week: w,
      jobs: jobsPerWeek[w] ?? 0,
      applications: appsPerWeek[w] ?? 0,
    }));

    res.json({ activeJobs, totalApplicants, newApplicants, shortlisted, chart });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
