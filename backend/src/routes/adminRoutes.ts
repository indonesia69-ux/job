import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { requireAdmin, AdminAuthRequest } from '../middleware/auth';
import { sendApprovalEmail, sendRejectionEmail, sendRequestMoreDocsEmail } from '../lib/email';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'apronhanger-dev-secret-change-in-prod';

/** Generate a cryptographically-random 12-character alphanumeric invite code */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Admin Auth ──────────────────────────────────────────────────────────────

// POST /api/admin/auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  try {
    const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin) {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() }
    });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: 'ADMIN' },
      SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, user: { id: admin.id, email: admin.email, name: admin.name, role: 'ADMIN' } });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

// GET /api/admin/auth/me
router.get('/auth/me', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  res.json({ user: { ...req.admin, role: 'ADMIN' } });
});

// ─── Admin Management - Hospitals ────────────────────────────────────────────

// GET /api/admin/hospitals
router.get('/hospitals', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const take = parseInt(req.query.take as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const [total, hospitals] = await prisma.$transaction([
      prisma.hospital.count(),
      prisma.hospital.findMany({
        orderBy: { submittedAt: 'desc' },
        include: {
          _count: {
            select: { jobs: true, users: true }
          }
        },
        take,
        skip
      })
    ]);
    res.json({ data: hospitals, total, take, skip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

// PATCH /api/admin/hospitals/:id/approve
// Approves the hospital onboarding and generates a unique 12-char invite code.
router.patch('/hospitals/:id/approve', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const hospital = await prisma.hospital.findUnique({ where: { id } });
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    // Generate a unique invite code — retry on collision (extremely rare)
    // ONLY generate a new code if the hospital doesn't already have one.
    let inviteCode: string = hospital.inviteCode || '';
    
    if (!inviteCode) {
      let attempts = 0;
      while (true) {
        inviteCode = generateInviteCode();
        const collision = await prisma.hospital.findUnique({ where: { inviteCode } });
        if (!collision) break;
        attempts++;
        if (attempts > 10) {
          res.status(500).json({ error: 'Could not generate a unique invite code. Please try again.' });
          return;
        }
      }
    }

    const updated = await prisma.hospital.update({
      where: { id: req.params.id as string },
      data: {
        onboardingStatus: 'Approved',
        approvedAt: new Date(),
        approvedBy: req.admin!.id,
        verified: true,
        verifiedOn: new Date().toISOString(),
        verifiedBy: req.admin!.name,
        inviteCode, // Store the generated or existing code
      }
    });

    // Notify any recruiters linked to this hospital (in case they were pre-linked somehow)
    const hospitalUsers = await prisma.user.findMany({
      where: { hospitalId: updated.id, role: 'RECRUITER' }
    });
    if (hospitalUsers.length > 0) {
      await prisma.inAppNotification.createMany({
        data: hospitalUsers.map(u => ({
          userId: u.id,
          title: 'Hospital Approved',
          message: `Your hospital "${updated.name}" has been approved. You can now post jobs.`,
        }))
      });
    }

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId: updated.id,
        action: 'approved',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ inviteCode })
      }
    });

    // Send activation email with invite code (non-fatal — email failure must not crash the response)
    sendApprovalEmail(updated).catch(err =>
      logger.error('[Email] Approval email failed for hospital %s: %s', updated.id, err?.message || err)
    );

    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to approve hospital' });
  }
});

// PATCH /api/admin/hospitals/:id/reject
router.patch('/hospitals/:id/reject', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  // Accept 'reason' (preferred) or legacy 'note'
  const { reason, note } = req.body;
  const rejectionReason = (reason || note || '').toString().trim();
  try {
    const id = req.params.id as string;
    const updated = await prisma.hospital.update({
      where: { id },
      data: {
        onboardingStatus: 'Rejected',
        onboardingNote: rejectionReason || null,
      }
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId: updated.id,
        action: 'rejected',
        actorId: req.admin!.id,
        actorRole: 'ADMIN',
        meta: JSON.stringify({ reason: rejectionReason })
      }
    });

    // Send rejection email (non-fatal)
    sendRejectionEmail(updated, rejectionReason).catch(err =>
      logger.error('[Email] Rejection email failed for hospital %s: %s', updated.id, err?.message || err)
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject hospital' });
  }
});

// PATCH /api/admin/hospitals/:id/request-more-documents
router.patch('/hospitals/:id/request-more-documents', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  const { requestedDocuments } = req.body;

  if (!requestedDocuments || !String(requestedDocuments).trim()) {
    res.status(400).json({ error: 'requestedDocuments is required — list the documents you need.' });
    return;
  }

  try {
    const id = req.params.id as string;

    const hospital = await prisma.hospital.findUnique({ where: { id } });
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    const updated = await prisma.hospital.update({
      where: { id },
      data: {
        onboardingStatus:   'RequestMoreDocuments',
        requestedDocuments: String(requestedDocuments).trim(),
      }
    });

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId:   updated.id,
        action:     'request_more_documents',
        actorId:    req.admin!.id,
        actorRole:  'ADMIN',
        meta:       JSON.stringify({ requestedDocuments: String(requestedDocuments).trim() })
      }
    });

    // Send docs-request email (non-fatal)
    sendRequestMoreDocsEmail(updated, String(requestedDocuments).trim()).catch(err =>
      logger.error('[Email] Docs-request email failed for hospital %s: %s', updated.id, err?.message || err)
    );

    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to request more documents' });
  }
});

// ─── Admin Management - Recruiters & Candidates ──────────────────────────────

// GET /api/admin/recruiters
router.get('/recruiters', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const take = parseInt(req.query.take as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const [total, recruiters] = await prisma.$transaction([
      prisma.user.count({ where: { role: 'RECRUITER' } }),
      prisma.user.findMany({
        where: { role: 'RECRUITER' },
        include: { hospital: true },
        orderBy: { createdAt: 'desc' },
        take,
        skip
      })
    ]);
    res.json({ data: recruiters, total, take, skip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recruiters' });
  }
});

// GET /api/admin/candidates
router.get('/candidates', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const take = parseInt(req.query.take as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const [total, candidates] = await prisma.$transaction([
      prisma.candidate.count(),
      prisma.candidate.findMany({
        include: {
          _count: {
            select: { applications: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip
      })
    ]);
    res.json({ data: candidates, total, take, skip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const recruitersCount = await prisma.user.count({ where: { role: 'RECRUITER' } });
    const candidatesCount = await prisma.candidate.count();
    const activeJobsCount = await prisma.job.count({ where: { status: 'Active' } });
    const applicationsCount = await prisma.application.count();
    const verifiedUsersCount = await prisma.hospital.count({ where: { verified: true } }) + await prisma.candidate.count({ where: { verified: true } });
    const pendingHospitalsCount = await prisma.hospital.count({ where: { onboardingStatus: 'Pending' } });

    res.json({
      kpiData: {
        totalRecruiters: recruitersCount,
        totalCandidates: candidatesCount,
        activeJobs: activeJobsCount,
        totalApplications: applicationsCount,
        verifiedUsers: verifiedUsersCount,
        pendingVerifications: pendingHospitalsCount,
      },
      activityFeed: [], 
      monthlyTrend: [],
      userGrowth: [],
      roleDistribution: [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/jobs
router.get('/jobs', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const take = parseInt(req.query.take as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const [total, jobs] = await prisma.$transaction([
      prisma.job.count(),
      prisma.job.findMany({
        include: {
          hospital: true
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip
      })
    ]);
    
    // Map to match admin UI store expectations
    const mappedJobs = jobs.map((job) => ({
      id: job.id,
      title: job.role,
      hospitalId: job.hospitalId,
      recruiterId: '', // Default since jobs are associated with hospitals
      location: job.location,
      status: job.status,
      posted: job.postedOn ? new Date(job.postedOn).toISOString().slice(0, 10) : ''
    }));
    
    res.json({ data: mappedJobs, total, take, skip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/admin/applications
router.get('/applications', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const applications = await prisma.application.findMany({
      include: {
        candidate: true,
        job: { include: { hospital: true } }
      },
      orderBy: { appliedOn: 'desc' },
      take: 100
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET /api/admin/logs
router.get('/logs', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
