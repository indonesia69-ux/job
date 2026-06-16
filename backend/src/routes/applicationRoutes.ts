import logger from '../lib/logger';
import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { formatApp, parseJobCustomFields, validateCustomFieldResponses, syncFormProfile, safeJsonParse } from '../lib/helpers';
import { sendOfferLetterEmail } from '../lib/email';
import multer from 'multer';
import { uploadRawBuffer } from '../lib/cloudinary';

const router = Router();

// ─── Multer for offer-letter PDF upload ──────────────────────────────────────
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF, JPEG, PNG, and WebP are allowed.`));
    }
  }
});

// ─── Status definitions ───────────────────────────────────────────────────────

/** All valid application statuses in the system. */
const ALL_STATUSES = [
  'Applied', 'Reviewed',
  'InterviewScheduled', 'InterviewAccepted', 'InterviewDeclined', 'RescheduleRequested',
  'InterviewCompleted', 'NoShow', 'InterviewRescheduled',
  'Shortlisted', 'OnHold', 'NextRound',
  'Rejected',
  'DocumentsRequested', 'DocumentsUploaded',
  'DocumentsApproved', 'AdditionalDocumentsRequired', 'DocumentsRejected',
  'OfferSent', 'OfferAccepted', 'OfferRejected',
  'JoiningConfirmed', 'Joined',
  'Onboarded', 'Dropped',
  'JobClosed',
] as const;

type AppStatus = typeof ALL_STATUSES[number];

const TERMINAL_STATUSES: AppStatus[] = [
  'Onboarded', 'Dropped', 'OfferRejected', 'DocumentsRejected',
  'Rejected', 'InterviewDeclined', 'JobClosed',
];

/** Recruiter-only allowed transitions from each status. Key '*' means any status. */
const RECRUITER_TRANSITIONS: Record<string, AppStatus[]> = {
  '*':                         ['DocumentsRequested'],   // doc request can come from ANY status
  'Applied':                   ['Reviewed'],
  'Reviewed':                  ['InterviewScheduled', 'Rejected'],
  'RescheduleRequested':       ['InterviewScheduled', 'InterviewDeclined', 'Rejected'],
  'InterviewAccepted':         ['InterviewCompleted', 'NoShow'],
  'InterviewCompleted':        ['Shortlisted', 'Rejected', 'OnHold', 'NextRound'],
  'NoShow':                    ['Rejected', 'InterviewRescheduled'],
  'InterviewRescheduled':      ['InterviewScheduled'],
  'Shortlisted':               ['DocumentsRequested'],
  'OnHold':                    ['Shortlisted', 'Rejected', 'DocumentsRequested', 'InterviewScheduled'],
  'DocumentsUploaded':         ['DocumentsApproved', 'AdditionalDocumentsRequired', 'DocumentsRejected'],
  'AdditionalDocumentsRequired': ['DocumentsRequested'],
  'DocumentsApproved':         ['OfferSent'],
  'OfferAccepted':             ['JoiningConfirmed'],
  'JoiningConfirmed':          ['Joined'],
  'Joined':                    ['Onboarded', 'Dropped'],
};

/** Candidate-only allowed transitions from each status. */
const CANDIDATE_TRANSITIONS: Record<string, AppStatus[]> = {
  'InterviewScheduled':          ['InterviewAccepted', 'InterviewDeclined', 'RescheduleRequested'],
  'DocumentsRequested':          ['DocumentsUploaded'],
  'AdditionalDocumentsRequired': ['DocumentsUploaded'],
  'OfferSent':                   ['OfferAccepted', 'OfferRejected'],
};

function getAllowedNextStatuses(current: string, role: 'RECRUITER' | 'CANDIDATE'): AppStatus[] {
  const transitions = role === 'RECRUITER' ? RECRUITER_TRANSITIONS : CANDIDATE_TRANSITIONS;
  const specific = transitions[current] ?? [];
  // Recruiter wildcard: DocumentsRequested from any non-terminal status
  if (role === 'RECRUITER') {
    const wildcard = (RECRUITER_TRANSITIONS['*'] ?? []).filter(
      s => !TERMINAL_STATUSES.includes(current as AppStatus)
    );
    return [...new Set([...specific, ...wildcard])];
  }
  return specific;
}

// ─── Required fields per target status ───────────────────────────────────────
function validateTransitionPayload(
  targetStatus: AppStatus,
  body: Record<string, unknown>
): { ok: true } | { ok: false; error: string } {
  if (targetStatus === 'InterviewScheduled' || targetStatus === 'NextRound') {
    if (!body.interviewDate) return { ok: false, error: 'interviewDate is required' };
    if (!body.interviewType) return { ok: false, error: 'interviewType (Virtual/Physical) is required' };
    if (!body.interviewerName) return { ok: false, error: 'interviewerName is required' };
    if (body.interviewType === 'Virtual' && !body.meetingLink)
      return { ok: false, error: 'meetingLink is required for Virtual interviews' };
    if (body.interviewType === 'Physical' && !body.venue)
      return { ok: false, error: 'venue is required for Physical interviews' };
    const interviewDate = new Date(String(body.interviewDate));
    if (Number.isNaN(interviewDate.getTime())) return { ok: false, error: 'interviewDate must be valid' };
    if (interviewDate.getTime() <= Date.now()) return { ok: false, error: 'Interview date/time must be in the future' };
  }
  if (targetStatus === 'RescheduleRequested') {
    if (!body.candidateResponseNote) return { ok: false, error: 'A reason is required to request a reschedule' };
  }
  if (targetStatus === 'DocumentsRequested') {
    if (!body.requestedDocumentList || !Array.isArray(body.requestedDocumentList) || body.requestedDocumentList.length === 0)
      return { ok: false, error: 'requestedDocumentList (array of document names) is required' };
  }
  if (targetStatus === 'OfferSent') {
    if (!body.offerLetterUrl) return { ok: false, error: 'offerLetterUrl is required (upload the PDF first)' };
    if (!body.offerLetterCloudinaryId) return { ok: false, error: 'offerLetterCloudinaryId is required' };
  }
  if (targetStatus === 'JoiningConfirmed') {
    if (!body.joiningDate) return { ok: false, error: 'joiningDate is required' };
    const joiningDate = new Date(String(body.joiningDate));
    if (Number.isNaN(joiningDate.getTime())) return { ok: false, error: 'joiningDate must be valid' };
  }
  return { ok: true };
}

// ─── Build interview history JSON ─────────────────────────────────────────────
function buildInterviewHistory(
  existing: { interviewHistory: string | null; interviewDate: Date | null; interviewType: string | null; meetingLink: string | null; venue: string | null; interviewerName: string | null; interviewerEmail: string | null; interviewNotes: string | null; },
  newSchedule: Record<string, unknown>
): string {
  const prev = safeJsonParse<Record<string, unknown>>(existing.interviewHistory, {});
  const currentSlot = {
    interviewDate: existing.interviewDate,
    interviewType: existing.interviewType,
    meetingLink: existing.meetingLink,
    venue: existing.venue,
    interviewerName: existing.interviewerName,
    interviewerEmail: existing.interviewerEmail,
    interviewNotes: existing.interviewNotes,
  };
  const history = Array.isArray(prev.history) ? prev.history : [];
  if (existing.interviewDate) history.push({ ...currentSlot, changedAt: new Date().toISOString() });
  return JSON.stringify({
    originalSchedule: prev.originalSchedule ?? (existing.interviewDate ? currentSlot : newSchedule),
    updatedSchedule: newSchedule,
    rescheduleCount: (Number(prev.rescheduleCount) || 0) + (existing.interviewDate ? 1 : 0),
    history,
  });
}

// ─── Notification helper ──────────────────────────────────────────────────────
async function createNotification(userId: string, title: string, message: string, link?: string) {
  try {
    await prisma.inAppNotification.create({
      data: { userId, title, message, link: link ?? null },
    });
  } catch (e) {
    logger.warn('[Notification] Failed to create notification: %s', e);
  }
}

async function notifyCandidate(
  candidateUserId: string | null | undefined,
  title: string,
  message: string,
  link?: string
) {
  if (!candidateUserId) return;
  await createNotification(candidateUserId, title, message, link);
}

async function notifyRecruiter(hospitalId: string, title: string, message: string, link?: string) {
  try {
    const recruiters = await prisma.user.findMany({ where: { hospitalId, role: 'RECRUITER' }, select: { id: true } });
    for (const r of recruiters) await createNotification(r.id, title, message, link);
  } catch (e) {
    logger.warn('[Notification] Failed to notify recruiters: %s', e);
  }
}

// ─── GET /api/applications ────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let where: Record<string, unknown> = {};
    if (req.user!.role === 'RECRUITER') {
      const hospitalId = req.user!.hospitalId;
      if (!hospitalId) { res.json([]); return; }

      // If caller requests a specific job, filter directly — avoids over-fetching
      const requestedJobId = typeof req.query.jobId === 'string' ? req.query.jobId : null;
      if (requestedJobId) {
        // Verify the job belongs to this hospital (auth guard)
        const job = await prisma.job.findFirst({
          where: { id: requestedJobId, hospitalId },
          select: { id: true },
        });
        if (!job) {
          res.status(403).json({ error: 'Job not found or access denied' });
          return;
        }
        where = { jobId: requestedJobId };
      } else {
        const jobs = await prisma.job.findMany({ where: { hospitalId }, select: { id: true } });
        where = { jobId: { in: jobs.map(j => j.id) } };
      }
    } else if (req.user!.role === 'CANDIDATE') {
      where = { candidateId: req.user!.candidateId! };
    }

    const isPaginated = req.query.page !== undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    if (isPaginated) {
      const [applications, total] = await Promise.all([
        prisma.application.findMany({
          where,
          include: { candidate: true, job: { include: { hospital: true } } },
          orderBy: { appliedOn: 'desc' },
          skip,
          take: limit,
        }),
        prisma.application.count({ where })
      ]);
      res.json({
        data: applications.map((app) => formatApp(app, { redactCandidateContact: req.user!.role === 'RECRUITER' })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
      return;
    }

    const applications = await prisma.application.findMany({
      where,
      include: { candidate: true, job: { include: { hospital: true } } },
      orderBy: { appliedOn: 'desc' },
      take: 50,
    });
    res.json(applications.map((app) => formatApp(app, { redactCandidateContact: req.user!.role === 'RECRUITER' })));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/applications/:id/recruiter-cv ──────────────────────────────────
router.get('/:id/recruiter-cv', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  try {
    const app = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: {
        candidate: true,
        job: { include: { hospital: true } },
      },
    });
    if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
    if (!req.user!.hospitalId || app.job.hospitalId !== req.user!.hospitalId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const formatted = formatApp(app, { redactCandidateContact: true });
    res.json({
      applicationId: formatted.id,
      candidate: formatted.candidate,
      job: formatted.job,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/applications/:id ────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const app = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: {
        candidate: true,
        job: { include: { hospital: true } },
        applicationDocuments: { orderBy: { uploadedAt: 'desc' } },
      },
    });
    if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
    // Auth check
    if (req.user!.role === 'RECRUITER') {
      if (!req.user!.hospitalId || app.job.hospitalId !== req.user!.hospitalId) {
        res.status(403).json({ error: 'Forbidden' }); return;
      }
    }
    if (req.user!.role === 'CANDIDATE' && app.candidateId !== req.user!.candidateId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    res.json(formatApp(app, { redactCandidateContact: req.user!.role === 'RECRUITER' }));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/applications ────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('CANDIDATE'), async (req: AuthRequest, res: Response) => {
  const { jobId, profile, cvSource, uploadedCv, customFieldResponses, cvUrl, cvCloudinaryId, cvName, cvMime, supportingDocuments } = req.body;
  const candidateId = req.user!.candidateId;
  if (!candidateId) { res.status(400).json({ error: 'No candidate profile linked to your account' }); return; }
  if (!jobId) { res.status(400).json({ error: 'jobId is required' }); return; }
  try {
    const job = await prisma.job.findUnique({ where: { id: String(jobId) } });
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    if (job.status === 'Closed') { res.status(400).json({ error: 'This job is no longer accepting applications' }); return; }
    const existing = await prisma.application.findUnique({
      where: { jobId_candidateId: { jobId: String(jobId), candidateId } },
    });
    if (existing) { res.status(409).json({ error: 'You have already applied to this job' }); return; }

    const jobCustomFields = parseJobCustomFields(job.customApplicationFields);
    const responseCheck = validateCustomFieldResponses(jobCustomFields, customFieldResponses);
    if (!responseCheck.ok) { res.status(400).json({ error: responseCheck.error }); return; }
    const customResponsesJson =
      Object.keys(responseCheck.normalized).length > 0 ? JSON.stringify(responseCheck.normalized) : null;

    const source = cvSource === 'upload' ? 'upload' : 'form';
    let appCv: {
      uploadedCvName?: string | null; uploadedCvMime?: string | null; uploadedCvData?: string | null;
      cvUrl?: string | null; cvCloudinaryId?: string | null;
    } = {};

    if (cvUrl) {
      appCv = {
        cvUrl: String(cvUrl),
        cvCloudinaryId: cvCloudinaryId ? String(cvCloudinaryId) : null,
        uploadedCvName: cvName ? String(cvName) : null,
        uploadedCvMime: cvMime ? String(cvMime) : null,
      };
    } else {
      const attachCvIfPresent = () => {
        if (!uploadedCv?.data || !uploadedCv?.name) return;
        const maxBytes = 5 * 1024 * 1024;
        if (String(uploadedCv.data).length > maxBytes * 1.4) throw new Error('CV file must be under 5MB');
        appCv = {
          uploadedCvName: String(uploadedCv.name),
          uploadedCvMime: String(uploadedCv.mime || 'application/pdf'),
          uploadedCvData: String(uploadedCv.data),
        };
      };
      try { attachCvIfPresent(); } catch (e) {
        res.status(400).json({ error: e instanceof Error ? e.message : 'Invalid CV file' }); return;
      }
    }

    if (source === 'form') {
      if (!profile) { res.status(400).json({ error: 'Profile is required for form applications' }); return; }
      await syncFormProfile(candidateId, profile, req.user!.email, {
        cvUrl: appCv.cvUrl || undefined,
        cvCloudinaryId: appCv.cvCloudinaryId || undefined,
        name: appCv.uploadedCvName || undefined,
        mime: appCv.uploadedCvMime || undefined,
      }, supportingDocuments);
    } else {
      if (!appCv.cvUrl && !appCv.uploadedCvData) {
        res.status(400).json({ error: 'CV file is required for upload applications' }); return;
      }
      const contact = uploadedCv?.contact || {};
      const updatedCandidate = await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          name: String(contact.name || req.user!.name),
          email: String(contact.email || req.user!.email),
          phone: contact.phone ? String(contact.phone) : null,
          cvSource: 'upload',
          ...appCv,
          initials: String(contact.name || req.user!.name).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
        },
      });
      if (updatedCandidate.phone) {
        await prisma.user.updateMany({
          where: { candidate: { id: candidateId } },
          data: { mobile: updatedCandidate.phone, name: updatedCandidate.name },
        });
      }
    }

    const application = await prisma.application.create({
      data: {
        jobId: String(jobId), candidateId, status: 'Applied',
        cvSource: source, customFieldResponses: customResponsesJson,
        supportingDocuments: supportingDocuments ? JSON.stringify(supportingDocuments) : null,
        ...appCv,
      },
      include: { candidate: true, job: { include: { hospital: true } } },
    });
    await notifyRecruiter(
      job.hospitalId,
      'New Application',
      `${application.candidate.name} applied for ${application.job.role}.`,
      `/applicants?jobId=${application.jobId}`,
    );
    res.status(201).json(formatApp(application));
  } catch (error: any) {
    logger.error(error);
    if (error?.code === 'P2002') { res.status(409).json({ error: 'You have already applied to this job' }); return; }
    const msg = typeof error?.message === 'string' ? error.message : 'Failed to submit application';
    res.status(400).json({ error: msg.slice(0, 200) });
  }
});

// ─── PATCH /api/applications/:id ─────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { status, ...rest } = req.body as { status: string } & Record<string, unknown>;
  if (!status) { res.status(400).json({ error: 'status is required' }); return; }

  const userRole = req.user!.role as 'RECRUITER' | 'CANDIDATE';
  if (!['RECRUITER', 'CANDIDATE'].includes(userRole)) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  try {
    const existing = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: {
        job: { include: { hospital: true } },
        candidate: true,
      },
    });
    if (!existing) { res.status(404).json({ error: 'Application not found' }); return; }

    // Auth: recruiter must belong to the hospital
    if (userRole === 'RECRUITER') {
      if (!req.user!.hospitalId || existing.job.hospitalId !== req.user!.hospitalId) {
        res.status(403).json({ error: 'Forbidden' }); return;
      }
    }
    // Auth: candidate must own the application
    if (userRole === 'CANDIDATE' && existing.candidateId !== req.user!.candidateId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    // Terminal check
    if (TERMINAL_STATUSES.includes(existing.status as AppStatus)) {
      res.status(400).json({ error: `Application status "${existing.status}" is final and cannot be changed.` }); return;
    }

    // Transition check
    const allowed = getAllowedNextStatuses(existing.status, userRole);
    if (!allowed.includes(status as AppStatus)) {
      res.status(400).json({
        error: `Cannot move from "${existing.status}" to "${status}" as ${userRole}. Allowed: ${allowed.join(', ') || 'none'}.`,
      }); return;
    }

    // Payload validation
    const payloadCheck = validateTransitionPayload(status as AppStatus, rest);
    if (!payloadCheck.ok) { res.status(400).json({ error: payloadCheck.error }); return; }

    // ── Build the update data ────────────────────────────────────────────────
    const updateData: Record<string, unknown> = { status };

    // Timestamp milestones
    if (status === 'Reviewed') updateData.reviewedAt = new Date();
    if (status === 'InterviewScheduled' || status === 'NextRound') updateData.interviewScheduledAt = new Date();
    if (status === 'OfferSent') updateData.offerSentAt = new Date();
    if (status === 'Joined') updateData.joinedAt = new Date();

    // ── Interview scheduling fields ───────────────────────────────────────────
    if (status === 'InterviewScheduled' || status === 'NextRound') {
      const newSchedule = {
        interviewDate: rest.interviewDate,
        interviewType: rest.interviewType,
        meetingLink: rest.meetingLink ?? null,
        venue: rest.venue ?? null,
        interviewerName: rest.interviewerName,
        interviewerEmail: rest.interviewerEmail ?? null,
        interviewNotes: rest.interviewNotes ?? null,
      };
      updateData.interviewDate = new Date(rest.interviewDate as string);
      updateData.interviewType = rest.interviewType;
      updateData.meetingLink = rest.meetingLink ?? null;
      updateData.venue = rest.venue ?? null;
      updateData.interviewerName = rest.interviewerName;
      updateData.interviewerEmail = rest.interviewerEmail ?? null;
      updateData.interviewNotes = rest.interviewNotes ?? null;
      updateData.interviewHistory = buildInterviewHistory(existing as any, newSchedule);
    }

    // ── NextRound: auto-increment round counter ───────────────────────────────
    if (status === 'NextRound') {
      updateData.interviewRound = (existing.interviewRound ?? 1) + 1;
      // Immediately move to InterviewScheduled — recruiter will fill details next
      updateData.status = 'InterviewScheduled';
    }

    // ── Candidate response ────────────────────────────────────────────────────
    if (rest.candidateResponseNote !== undefined) updateData.candidateResponseNote = rest.candidateResponseNote;

    // ── Interview outcome note ────────────────────────────────────────────────
    if (rest.interviewOutcomeNote !== undefined) updateData.interviewOutcomeNote = rest.interviewOutcomeNote;

    // ── Document request ──────────────────────────────────────────────────────
    if (status === 'DocumentsRequested') {
      updateData.requestedDocumentList = JSON.stringify(rest.requestedDocumentList);
      if (rest.documentRequestNote !== undefined) updateData.documentRequestNote = rest.documentRequestNote;
    }

    // ── Offer letter ──────────────────────────────────────────────────────────
    if (status === 'OfferSent') {
      updateData.offerLetterUrl = rest.offerLetterUrl;
      updateData.offerLetterCloudinaryId = rest.offerLetterCloudinaryId;
    }

    // ── Joining ───────────────────────────────────────────────────────────────
    if (status === 'JoiningConfirmed') {
      updateData.joiningDate = new Date(rest.joiningDate as string);
      if (rest.joiningNote !== undefined) updateData.joiningNote = rest.joiningNote;
    }

    // ── Final status note ─────────────────────────────────────────────────────
    if (rest.finalStatusNote !== undefined) updateData.finalStatusNote = rest.finalStatusNote;

    const updated = await prisma.application.update({
      where: { id: existing.id },
      data: updateData as any,
      include: {
        candidate: true,
        job: { include: { hospital: true } },
        applicationDocuments: { orderBy: { uploadedAt: 'desc' } },
      },
    });

    // ── Notifications ─────────────────────────────────────────────────────────
    const candidateName = existing.candidate.name;
    const hospitalName = (existing.job.hospital as any)?.name ?? 'The hospital';
    const jobRole = existing.job.role;
    const candidateUserId = existing.candidate.userId;
    const hospitalId = existing.job.hospitalId;
    const finalStatus = updateData.status as string ?? status;

    switch (finalStatus) {
      case 'InterviewScheduled': {
        const isReschedule = (existing.status === 'RescheduleRequested' || existing.status === 'InterviewScheduled');
        const dateStr = updateData.interviewDate ? new Date(updateData.interviewDate as Date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        const title = isReschedule ? 'Interview Rescheduled' : 'Interview Scheduled';
        const msg = isReschedule
          ? `Your interview for ${jobRole} has been rescheduled to ${dateStr}.`
          : `Your interview for ${jobRole} has been scheduled on ${dateStr} (${updateData.interviewType}).`;
        await notifyCandidate(candidateUserId, title, msg, '/applications');
        break;
      }
      case 'RescheduleRequested':
        await notifyRecruiter(hospitalId, 'Reschedule Requested', `${candidateName} has requested to reschedule their interview for ${jobRole}.`, `/applicants?jobId=${existing.jobId}`);
        break;
      case 'InterviewDeclined':
        if (existing.status === 'RescheduleRequested') {
          await notifyCandidate(candidateUserId, 'Reschedule Rejected', `${hospitalName} could not approve your reschedule request for ${jobRole}.`, '/applications');
        } else {
          await notifyRecruiter(hospitalId, 'Interview Declined', `${candidateName} has declined the interview for ${jobRole}.`, `/applicants?jobId=${existing.jobId}`);
        }
        break;
      case 'Rejected':
        await notifyCandidate(candidateUserId, 'Application Closed', `${hospitalName} has closed your application for ${jobRole}.`, '/applications');
        break;
      case 'DocumentsRequested': {
        const n = Array.isArray(rest.requestedDocumentList) ? rest.requestedDocumentList.length : 0;
        await notifyCandidate(candidateUserId, 'Documents Requested', `${hospitalName} has requested ${n} document${n !== 1 ? 's' : ''} for your ${jobRole} application.`, '/applications');
        break;
      }
      case 'DocumentsUploaded':
        await notifyRecruiter(hospitalId, 'Documents Uploaded', `${candidateName} has uploaded the requested documents for ${jobRole}.`, `/applicants?jobId=${existing.jobId}`);
        break;
      case 'AdditionalDocumentsRequired':
        await notifyCandidate(candidateUserId, 'Additional Documents Required', `${hospitalName} requires additional documents for your ${jobRole} application.`, '/applications');
        break;
      case 'OfferSent':
        await notifyCandidate(candidateUserId, 'Offer Letter Received', `You have received an offer letter from ${hospitalName} for ${jobRole}. Please review and respond.`, '/applications');
        // Brevo email — only trigger for offer letter
        try {
          await sendOfferLetterEmail(
            { name: candidateName, email: existing.candidate.email },
            { role: jobRole, hospitalName },
            String(rest.offerLetterUrl),
          );
        } catch (emailErr) {
          logger.warn('[Email] Offer letter email failed: %s', emailErr);
        }
        break;
      case 'OfferAccepted':
        await notifyRecruiter(hospitalId, 'Offer Accepted', `${candidateName} has accepted the offer for ${jobRole}.`, `/applicants?jobId=${existing.jobId}`);
        break;
      case 'OfferRejected':
        await notifyRecruiter(hospitalId, 'Offer Rejected', `${candidateName} has declined the offer for ${jobRole}.`, `/applicants?jobId=${existing.jobId}`);
        break;
      case 'JoiningConfirmed': {
        const joinDateStr = updateData.joiningDate ? new Date(updateData.joiningDate as Date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        await notifyCandidate(candidateUserId, 'Joining Date Confirmed', `Your joining date for ${jobRole} at ${hospitalName} has been confirmed: ${joinDateStr}.`, '/applications');
        break;
      }
      case 'Joined':
        await notifyRecruiter(hospitalId, 'Candidate Joined', `${candidateName} has officially joined for ${jobRole}.`, `/applicants?jobId=${existing.jobId}`);
        break;
    }

    res.json(formatApp(updated, { redactCandidateContact: userRole === 'RECRUITER' }));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/applications/:id/documents ─────────────────────────────────────
router.get('/:id/documents', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const app = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: { job: true, candidate: true },
    });
    if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
    if (req.user!.role === 'RECRUITER' && req.user!.hospitalId && app.job.hospitalId !== req.user!.hospitalId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    if (req.user!.role === 'CANDIDATE' && app.candidateId !== req.user!.candidateId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const docs = await prisma.applicationDocument.findMany({
      where: { applicationId: app.id },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(docs);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/applications/:id/documents ────────────────────────────────────
// Candidate uploads documents in response to a document request
router.post('/:id/documents', requireAuth, requireRole('CANDIDATE'), upload.array('documents', 15), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) { res.status(400).json({ error: 'No documents provided' }); return; }

    const app = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: { job: true, candidate: true },
    });
    if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
    if (app.candidateId !== req.user!.candidateId) { res.status(403).json({ error: 'Forbidden' }); return; }

    // Parse names from body: names[] or name (single), matched by index
    const names: string[] = Array.isArray(req.body.names) ? req.body.names : (req.body.name ? [req.body.name] : []);

    const timestamp = Date.now();
    const uploadPromises = files.map((file, i) => {
      const publicId = `app_${app.id}_doc_${timestamp}_${i}`;
      return uploadRawBuffer(file.buffer, 'applications/documents', publicId).then(result => ({ file, result, i }));
    });
    
    const uploadResults = await Promise.all(uploadPromises);

    const docData = uploadResults.map(({ file, result, i }) => ({
      applicationId: app.id,
      name: names[i] || file.originalname,
      url: result.secure_url,
      cloudinaryId: result.public_id,
      mime: file.mimetype,
      uploadedBy: 'CANDIDATE',
    }));

    await prisma.applicationDocument.createMany({ data: docData });
    const created = await prisma.applicationDocument.findMany({
      where: { applicationId: app.id, cloudinaryId: { in: docData.map(d => d.cloudinaryId) } }
    });

    // Move status to DocumentsUploaded if currently in DocumentsRequested or AdditionalDocumentsRequired
    if (app.status === 'DocumentsRequested' || app.status === 'AdditionalDocumentsRequired') {
      await prisma.application.update({
        where: { id: app.id },
        data: { status: 'DocumentsUploaded' },
      });
      // Notify recruiter
      const hospitalId = app.job.hospitalId;
      await notifyRecruiter(hospitalId, 'Documents Uploaded', `${app.candidate.name} has uploaded the requested documents for ${app.job.role}.`, `/applicants?jobId=${app.jobId}`);
    }

    res.status(201).json(created);
  } catch (error: any) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to upload documents' });
  }
});

// ─── POST /api/applications/:id/offer-letter ─────────────────────────────────
// Recruiter uploads offer letter PDF to Cloudinary, returns URL
router.post('/:id/offer-letter', requireAuth, requireRole('RECRUITER'), upload.single('offerLetter'), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No offer letter file provided' }); return; }

    const app = await prisma.application.findUnique({
      where: { id: String(req.params.id) },
      include: { job: true },
    });
    if (!app) { res.status(404).json({ error: 'Application not found' }); return; }
    if (req.user!.hospitalId && app.job.hospitalId !== req.user!.hospitalId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const timestamp = Date.now();
    const publicId = `offer_${app.id}_${timestamp}`;
    const result = await uploadRawBuffer(file.buffer, 'applications/offer-letters', publicId);

    // Persist to application immediately
    await prisma.application.update({
      where: { id: app.id },
      data: {
        offerLetterUrl: result.secure_url,
        offerLetterCloudinaryId: result.public_id,
      },
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      name: file.originalname,
      mime: file.mimetype,
    });
  } catch (error: any) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to upload offer letter' });
  }
});

export default router;
