import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getRecruiterLimit, ensureUsageReset, getHospitalValidity } from '../lib/helpers';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'apronhanger-dev-secret-change-in-prod';

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, fullName, username, mobile, role, inviteCode } = req.body;

  if (!email || !password || !name || !role) {
    res.status(400).json({ error: 'email, password, name, and role are required' });
    return;
  }
  if (!['CANDIDATE', 'RECRUITER'].includes(role)) {
    res.status(400).json({ error: 'role must be CANDIDATE or RECRUITER' });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email is already registered' });
      return;
    }

    if (username) {
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        res.status(409).json({ error: 'Username is already taken' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let hospitalId: string | undefined = undefined;
    let candidateId: string | undefined = undefined;

    if (role === 'RECRUITER') {
      // ── Invite-code-based signup ──────────────────────────────────────────
      if (!inviteCode) {
        res.status(400).json({ error: 'An invite code is required to sign up as a recruiter.' });
        return;
      }

      const hospital = await prisma.hospital.findUnique({
        where: { inviteCode: String(inviteCode).toUpperCase() },
      });

      if (!hospital) {
        res.status(400).json({ error: 'Invalid invite code. Please check the code provided by your hospital.' });
        return;
      }

      if (hospital.onboardingStatus !== 'Approved') {
        res.status(403).json({ error: 'This hospital has not been approved yet. Please wait for admin approval.' });
        return;
      }

      // Enforce plan-based recruiter limit
      const recruiterCount = await prisma.user.count({
        where: { hospitalId: hospital.id, role: 'RECRUITER' }
      });
      const limit = getRecruiterLimit(hospital.onboardingPlan);

      if (recruiterCount >= limit) {
        res.status(403).json({
          error: `This hospital has reached the maximum number of recruiters (${limit}) for the ${hospital.onboardingPlan} plan.`,
        });
        return;
      }

      hospitalId = hospital.id;
    }

    const user = await prisma.user.create({
      data: { email, passwordHash, name, fullName, username, mobile, role, hospitalId }
    });

    if (role === 'CANDIDATE') {
      const candidate = await prisma.candidate.create({
        data: {
          name,
          email,
          userId: user.id,
          initials: name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
        }
      });
      candidateId = candidate.id;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, hospitalId, candidateId },
      SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, hospitalId, candidateId }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    let candidateId: string | null = null;
    if (user.role === 'CANDIDATE') {
      const candidate = await prisma.candidate.findUnique({ where: { userId: user.id } });
      candidateId = candidate?.id ?? null;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, hospitalId: user.hospitalId, candidateId },
      SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, hospitalId: user.hospitalId, candidateId }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let user = await prisma.user.findUnique({ 
      where: { id: req.user!.id },
      include: { hospital: true }
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const finalUser = user.role === 'RECRUITER' ? await ensureUsageReset(prisma, user) : user;
    
    // Calculate dynamic validity
    let jobValidityDays = 30;
    let isLocked = false;
    if (finalUser.role === 'RECRUITER' && finalUser.hospital) {
      const validity = getHospitalValidity(finalUser.hospital);
      jobValidityDays = validity.daysRemaining;
      isLocked = validity.isLocked;
    }
    
    res.json({
      user: {
        id: finalUser.id,
        email: finalUser.email,
        name: finalUser.name,
        role: finalUser.role,
        hospitalId: finalUser.hospitalId,
        candidateId: req.user!.candidateId,
        jobsPostedThisMonth: finalUser.jobsPostedThisMonth,
        premiumSearchesThisMonth: finalUser.premiumSearchesThisMonth,
        plan: finalUser.hospital?.onboardingPlan || 'Basic',
        jobValidityDays,
        isLocked
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Valid name is required' });
    return;
  }
  
  try {
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name: name.trim() }
    });
    
    // Generate a new token with the updated name
    const token = jwt.sign(
      { 
        id: updated.id, 
        email: updated.email, 
        name: updated.name, 
        role: updated.role, 
        hospitalId: updated.hospitalId, 
        candidateId: req.user!.candidateId 
      },
      SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      token,
      user: { 
        id: updated.id, 
        email: updated.email, 
        name: updated.name, 
        role: updated.role, 
        hospitalId: updated.hospitalId, 
        candidateId: req.user!.candidateId 
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

export default router;
