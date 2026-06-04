import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { formatApp, parseJobCustomFields, validateCustomFieldResponses, syncFormProfile } from '../lib/helpers';

const router = Router();

// GET /api/applications
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let where: any = {};
    if (req.user!.role === 'RECRUITER') {
      const hospitalId = req.user!.hospitalId;
      if (!hospitalId) {
        res.json([]);
        return;
      }
      const jobs = await prisma.job.findMany({ where: { hospitalId }, select: { id: true } });
      where = { jobId: { in: jobs.map(j => j.id) } };
    } else if (req.user!.role === 'CANDIDATE') {
      where = { candidateId: req.user!.candidateId! };
    }
    const applications = await prisma.application.findMany({
      where,
      include: { candidate: true, job: { include: { hospital: true } } },
      orderBy: { appliedOn: 'desc' },
    });
    res.json(applications.map(formatApp));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/applications
router.post('/', requireAuth, requireRole('CANDIDATE'), async (req: AuthRequest, res: Response) => {
  const { jobId, profile, cvSource, uploadedCv, customFieldResponses, cvUrl, cvCloudinaryId, cvName, cvMime, supportingDocuments } = req.body;
  const candidateId = req.user!.candidateId;
  if (!candidateId) {
    res.status(400).json({ error: 'No candidate profile linked to your account' });
    return;
  }
  if (!jobId) {
    res.status(400).json({ error: 'jobId is required' });
    return;
  }
  try {
    const job = await prisma.job.findUnique({ where: { id: String(jobId) } });
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    if (job.status === 'Closed') {
      res.status(400).json({ error: 'This job is no longer accepting applications' });
      return;
    }
    const existing = await prisma.application.findUnique({
      where: { jobId_candidateId: { jobId: String(jobId), candidateId } },
    });
    if (existing) {
      res.status(409).json({ error: 'You have already applied to this job' });
      return;
    }

    const jobCustomFields = parseJobCustomFields(job.customApplicationFields);
    const responseCheck = validateCustomFieldResponses(jobCustomFields, customFieldResponses);
    if (!responseCheck.ok) {
      res.status(400).json({ error: responseCheck.error });
      return;
    }
    const customResponsesJson =
      Object.keys(responseCheck.normalized).length > 0
        ? JSON.stringify(responseCheck.normalized)
        : null;

    const source = cvSource === 'upload' ? 'upload' : 'form';
    let appCv: { 
      uploadedCvName?: string | null; 
      uploadedCvMime?: string | null; 
      uploadedCvData?: string | null;
      cvUrl?: string | null;
      cvCloudinaryId?: string | null;
    } = {};

    // Cloudinary path
    if (cvUrl) {
      appCv = {
        cvUrl: String(cvUrl),
        cvCloudinaryId: cvCloudinaryId ? String(cvCloudinaryId) : null,
        uploadedCvName: cvName ? String(cvName) : null,
        uploadedCvMime: cvMime ? String(cvMime) : null,
      };
    } else {
      // Legacy base64 path
      const attachCvIfPresent = () => {
        if (!uploadedCv?.data || !uploadedCv?.name) return;
        const maxBytes = 5 * 1024 * 1024;
        if (String(uploadedCv.data).length > maxBytes * 1.4) {
          throw new Error('CV file must be under 5MB');
        }
        appCv = {
          uploadedCvName: String(uploadedCv.name),
          uploadedCvMime: String(uploadedCv.mime || 'application/pdf'),
          uploadedCvData: String(uploadedCv.data),
        };
      };

      try { attachCvIfPresent(); } catch (e) {
        res.status(400).json({ error: e instanceof Error ? e.message : 'Invalid CV file' });
        return;
      }
    }

    if (source === 'form') {
      if (!profile) {
        res.status(400).json({ error: 'Profile is required for form applications' });
        return;
      }
      await syncFormProfile(candidateId, profile, req.user!.email, {
        cvUrl: appCv.cvUrl || undefined,
        cvCloudinaryId: appCv.cvCloudinaryId || undefined,
        name: appCv.uploadedCvName || undefined,
        mime: appCv.uploadedCvMime || undefined,
      }, supportingDocuments);
    } else {
      // It's an upload application
      if (!appCv.cvUrl && !appCv.uploadedCvData) {
        res.status(400).json({ error: 'CV file is required for upload applications' });
        return;
      }
      const contact = uploadedCv?.contact || {};
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          name: String(contact.name || req.user!.name),
          email: String(contact.email || req.user!.email),
          phone: contact.phone ? String(contact.phone) : null,
          cvSource: 'upload',
          ...appCv, // Saves the new CV ref or old base64
          initials: String(contact.name || req.user!.name)
            .split(' ')
            .map((w: string) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
        },
      });
    }

    const application = await prisma.application.create({
      data: {
        jobId: String(jobId),
        candidateId,
        status: 'New',
        cvSource: source,
        customFieldResponses: customResponsesJson,
        supportingDocuments: supportingDocuments ? JSON.stringify(supportingDocuments) : null,
        ...appCv,
      },
      include: { candidate: true, job: { include: { hospital: true } } },
    });
    res.status(201).json(formatApp(application));
  } catch (error: any) {
    logger.error(error);
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'You have already applied to this job' });
      return;
    }
    const msg = typeof error?.message === 'string' ? error.message : 'Failed to submit application';
    res.status(400).json({ error: msg.slice(0, 200) });
  }
});

// PATCH /api/applications/:id
router.patch('/:id', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }
  try {
    const existing = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: { job: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    if (req.user!.hospitalId && existing.job.hospitalId !== req.user!.hospitalId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    function allowedStatusTransitions(current: string): string[] {
      const s = current.toLowerCase();
      if (s === 'jobclosed') return [];
      if (s === 'new') return ['Reviewed'];
      if (s === 'reviewed') return ['Shortlisted', 'Rejected'];
      if (s === 'shortlisted') return ['Contacted'];
      return [];
    }

    const allowed = allowedStatusTransitions(existing.status);
    if (!allowed.includes(String(status))) {
      res.status(400).json({
        error: `Cannot move from ${existing.status} to ${status}. Follow: Reviewed → Shortlisted/Rejected → Contacted (from Shortlisted only).`,
      });
      return;
    }
    const updated = await prisma.application.update({
      where: { id: existing.id },
      data: { status: String(status) },
      include: { candidate: true, job: { include: { hospital: true } } },
    });
    res.json(formatApp(updated));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
