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

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
const VERIFIED_SECRET = SECRET as string;



export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, VERIFIED_SECRET) as any;
    
    // tokenVersion check for force-logout on password reset
    if (payload.tokenVersion !== undefined) {
      const user = await prisma.user.findUnique({ 
        where: { id: payload.id },
        select: { tokenVersion: true, isSuspended: true, deletedAt: true, hospital: { select: { isSuspended: true, deletedAt: true } } }
      });
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }
      if (user.tokenVersion !== payload.tokenVersion) {
        res.status(401).json({ error: 'Session invalidated. Please log in again.' });
        return;
      }
      if (user.isSuspended) {
        res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
        return;
      }
      if (user.deletedAt) {
        res.status(403).json({ error: 'Account not found.' });
        return;
      }
      if (user.hospital && (user.hospital.isSuspended || user.hospital.deletedAt)) {
        res.status(403).json({ error: 'Your hospital account has been suspended or deleted.' });
        return;
      }
    }

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
    const payload = jwt.verify(token, VERIFIED_SECRET) as any;
    
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
