import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { formatCandidate, getHospitalValidity } from '../lib/helpers';

const router = Router();

// GET /api/search/recruiter
router.get('/recruiter', requireAuth, requireRole('RECRUITER'), async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) {
    res.json([]);
    return;
  }
  
  try {
    const hospitalId = authReq.user?.hospitalId;
    if (hospitalId) {
      const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
      if (hospital) {
        const { isLocked } = getHospitalValidity(hospital);
        if (isLocked) {
          res.status(403).json({ error: 'Your account validity has expired. You cannot search candidates.', code: 'PLAN_EXPIRED' });
          return;
        }
      }
    }
    
    const candidates = await prisma.candidate.findMany({
      where: {
        OR: [
          { role: { contains: q } },
          { specialty: { contains: q } },
          { location: { contains: q } },
          { skills: { string_contains: q } } // NOTE: skills is a JSON string, so this does a text search inside JSON in Postgres
        ]
      },
      take: 20
    });
    res.json(candidates.map(formatCandidate));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
