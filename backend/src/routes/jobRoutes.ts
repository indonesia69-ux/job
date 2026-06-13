import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import {
  formatJob,
  normalizeJobCustomFields,
  isHospitalProfileComplete,
  extractCandidatePayload,
  safeJsonParse,
  ensureUsageReset,
  getJobLimit,
  computeVisibilityEndsAt,
  getHospitalValidity
} from '../lib/helpers';

const router = Router();
const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("FATAL: JWT_SECRET environment variable is not set.");
const VERIFIED_SECRET = SECRET as string;

async function getCandidateProfileForMatch(req: Request): Promise<any | null> {
  const payload = extractCandidatePayload(req.headers.authorization, VERIFIED_SECRET);
  if (!payload) return null;
  try {
    const c = await prisma.candidate.findUnique({ where: { id: payload.candidateId } });
    if (!c) return null;
    if (c.profileJson) return safeJsonParse(c.profileJson, null);
    return {
      role: c.role,
      yearsExperience: c.experienceYears,
      city: c.location,
      clinicalSkills: safeJsonParse(c.skills, []),
    };
  } catch {
    return null;
  }
}

async function canViewHospitalJobs(req: Request, hospitalId: string): Promise<boolean> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return false;
  try {
    const payload = jwt.verify(header.slice(7), VERIFIED_SECRET) as any;
    if (payload.role !== 'RECRUITER' || payload.hospitalId !== hospitalId) return false;
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        tokenVersion: true,
        isSuspended: true,
        deletedAt: true,
        hospital: { select: { isSuspended: true, deletedAt: true } },
      },
    });
    if (!user || user.isSuspended || user.deletedAt) return false;
    if (payload.tokenVersion !== undefined && user.tokenVersion !== payload.tokenVersion) return false;
    if (user.hospital?.isSuspended || user.hospital?.deletedAt) return false;
    return true;
  } catch {
    return false;
  }
}

// GET /api/jobs (supports ?q= search and ?hospitalId=)
router.get('/', async (req: Request, res: Response) => {
  const { hospitalId, q } = req.query;
  try {
    const profile = await getCandidateProfileForMatch(req);
    const requestedHospitalId = typeof hospitalId === 'string' ? hospitalId : '';
    const recruiterOwnHospital = requestedHospitalId
      ? await canViewHospitalJobs(req, requestedHospitalId)
      : false;

    // Build query
    const where: any = {};
    if (!recruiterOwnHospital) {
      where.status = 'Active';
      where.OR = [
        { visibilityEndsAt: null },
        { visibilityEndsAt: { gt: new Date() } }
      ];
    }
    if (requestedHospitalId) {
      where.hospitalId = requestedHospitalId;
    }

    // Public feed filter: hospital must not be suspended/deleted
    where.hospital = {
      isSuspended: false,
      deletedAt: null
    };

    // Basic search filtering (title or specialty matching)
    if (q && typeof q === 'string' && q.trim()) {
      const searchTerms = q.trim().split(' ').filter(Boolean);
      const searchFilter = searchTerms.map(term => ({
        OR: [
          { role: { contains: term } },
          { specialty: { contains: term } },
          { location: { contains: term } }
        ]
      }));
      if (where.OR) {
        where.AND = [{ OR: where.OR }, ...searchFilter];
        delete where.OR;
      } else {
        where.AND = searchFilter;
      }
    }

    const jobs = await prisma.job.findMany({
      where,
      include: { hospital: true, _count: { select: { applications: true } } },
      orderBy: { postedDays: 'asc' } // In SQLite/Postgres might need actual date sorting eventually
    });
    res.json(jobs.map((j) => formatJob(j, profile)));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/jobs/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const job = await prisma.job.findFirst({
      where: { 
        id: String(req.params.id),
        hospital: {
          isSuspended: false,
          deletedAt: null
        }
      },
      include: { hospital: true, _count: { select: { applications: true } } }
    });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    res.json(formatJob(job));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/jobs
router.post('/', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body;
    const hospitalId = req.user!.hospitalId;
    if (!hospitalId) {
      res.status(400).json({ error: 'No hospital linked to your account' });
      return;
    }
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found.' });
      return;
    }

    if (
      (b.role && b.role.length > 100) ||
      (b.specialty && b.specialty.length > 100) ||
      (b.location && b.location.length > 150) ||
      (b.description && b.description.length > 5000)
    ) {
      res.status(400).json({ error: 'One or more input fields exceed the maximum allowed length' });
      return;
    }

    // Check account validity lock
    const { isLocked } = getHospitalValidity(hospital);
    if (isLocked) {
      res.status(403).json({ error: 'Your account validity has expired. You cannot post new jobs.', code: 'PLAN_EXPIRED' });
      return;
    }

    const intendedStatus = String(b.status || 'Active');
    const allowedStatuses = ['Active', 'Draft', 'Closed'];
    if (!allowedStatuses.includes(intendedStatus)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
      return;
    }

    // Only fully Active posts require a complete hospital profile
    if (intendedStatus !== 'Draft' && !isHospitalProfileComplete(hospital)) {
      res.status(403).json({
        error: 'Complete your hospital profile in Settings before posting a job.',
        code: 'HOSPITAL_PROFILE_INCOMPLETE',
      });
      return;
    }

    // Check plan quota
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const updatedUser = await ensureUsageReset(prisma, user);
    const limit = getJobLimit(hospital.onboardingPlan || 'Basic');
    
    if (updatedUser.jobsPostedThisMonth >= limit) {
      res.status(403).json({
        error: `You have reached your limit of ${limit} job posts this month on the ${hospital.onboardingPlan} plan.`,
        code: 'PLAN_QUOTA_EXCEEDED',
      });
      return;
    }

    const [, job] = await prisma.$transaction([
      prisma.user.update({
        where: { id: updatedUser.id },
        data: { jobsPostedThisMonth: updatedUser.jobsPostedThisMonth + 1 }
      }),
      prisma.job.create({
      data: {
        hospitalId,
        visibilityEndsAt: intendedStatus === 'Active' ? computeVisibilityEndsAt(hospital.onboardingPlan || 'Basic') : null,
        postedOn: intendedStatus === 'Active' ? new Date() : null,
        role:            String(b.role       || ''),
        specialty:       String(b.specialty  || ''),
        category:        b.category   ? String(b.category)   : null,
        subSpecialty:    b.subSpecialty ? String(b.subSpecialty) : null,
        location:        String(b.location   || ''),
        city:            b.city       ? String(b.city)       : null,
        type:            String(b.type       || 'Full-time'),
        shift:           b.shift      ? String(b.shift)      : null,
        status:          intendedStatus,
        description:     String(b.description || ''),
        salaryMin:       Number(b.salaryMin  || 0),
        salaryMax:       Number(b.salaryMax  || 0),
        experienceMin:   b.experienceMin != null ? Number(b.experienceMin) : null,
        experienceMax:   b.experienceMax != null ? Number(b.experienceMax) : null,
        experience:      b.experience  ? String(b.experience) : null,
        postedDays:      0,
        tags:            b.tags || undefined,
        responsibilities: b.responsibilities ? JSON.stringify(b.responsibilities) : undefined,
        requirements:    b.requirements
          ? JSON.stringify(Array.isArray(b.requirements) ? b.requirements : [String(b.requirements)])
          : undefined,
        perks:           b.perks           ? JSON.stringify(b.perks)           : undefined,
        customApplicationFields: (() => {
          const parsed = normalizeJobCustomFields(b.customApplicationFields);
          if (!parsed.ok) throw new Error(parsed.error);
          return parsed.fields.length > 0 ? parsed.fields : undefined;
        })(),
      },
      include: { hospital: true, applications: true },
    })
    ]);
    res.status(201).json(formatJob(job));
  } catch (error: any) {
    if (error?.message && typeof error.message === 'string' && !error.code) {
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/jobs/:id
router.patch('/:id', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }
  try {
    const job = await prisma.job.findUnique({
      where: { id: String(req.params.id) },
      include: { applications: true },
    });
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    if (!req.user!.hospitalId || job.hospitalId !== req.user!.hospitalId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const nextStatus = String(status);
    const allowedPatchStatuses = ['Active', 'Closed', 'Draft'];
    if (!allowedPatchStatuses.includes(nextStatus)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${allowedPatchStatuses.join(', ')}` });
      return;
    }

    // Publishing a draft requires a complete hospital profile
    if (nextStatus === 'Active' && job.status === 'Draft') {
      const hospital = await prisma.hospital.findUnique({ where: { id: job.hospitalId } });
      if (!hospital || !isHospitalProfileComplete(hospital)) {
        res.status(403).json({
          error: 'Complete your hospital profile in Settings before publishing a job.',
          code: 'HOSPITAL_PROFILE_INCOMPLETE',
        });
        return;
      }

      // Update to active sets visibility
      const updated = await prisma.job.update({
        where: { id: job.id },
        data: { 
          status: 'Active',
          visibilityEndsAt: computeVisibilityEndsAt(hospital.onboardingPlan || 'Basic'),
          postedOn: new Date()
        },
        include: { hospital: true, applications: true },
      });
      res.json(formatJob(updated));
      return;
    }

    if (nextStatus === 'Closed') {
      if (job.status === 'Closed') {
        res.json(formatJob(job));
        return;
      }
      const [, updatedJob] = await prisma.$transaction([
        prisma.application.updateMany({
          where: {
            jobId: job.id,
            status: { in: ['New', 'Reviewed'] },
          },
          data: { status: 'JobClosed' },
        }),
        prisma.job.update({
          where: { id: job.id },
          data: { status: 'Closed' },
          include: { hospital: true, applications: true },
        }),
      ]);
      res.json(formatJob(updatedJob));
      return;
    }
    const updated = await prisma.job.update({
      where: { id: job.id },
      data: { status: nextStatus },
      include: { hospital: true, applications: true },
    });
    res.json(formatJob(updated));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
