import logger from '../lib/logger';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    hospitalId?: string;
    candidateId?: string | null;
  };
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.warn('WARNING: JWT_SECRET not set in environment. Falling back to dev secret.');
}
const SECRET = JWT_SECRET || 'apronhanger-dev-secret-change-in-prod';

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, SECRET) as any;
    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      hospitalId: payload.hospitalId,
      candidateId: payload.candidateId,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
}

export function requireRole(role: string | string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

// ─── Admin guard (checks AdminUser table) ────────────────────────────────────

export interface AdminAuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
    name: string;
  };
}

export async function requireAdmin(req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized admin' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, SECRET) as any;
    
    // Role check to ensure they didn't just use a normal recruiter/candidate JWT
    if (payload.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden. Not an admin.' });
      return;
    }

    // Double check DB to ensure the admin still exists/isn't revoked
    const admin = await prisma.adminUser.findUnique({ where: { id: payload.id } });
    if (!admin) {
      res.status(401).json({ error: 'Admin account not found or revoked' });
      return;
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired admin token' });
    return;
  }
}
