import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const prisma = new PrismaClient();

const ROLE_ALIASES: Record<string, string> = {
  MAKER: 'AUDITOR',
  CHECKER: 'AUDITOR',
  REVIEWER: 'AUDITOR',
  CONSULTANT: 'AUDITOR',
  CLIENT: 'AUDITOR',
};

export function normalizeUserRole(role?: string) {
  if (!role) return role;
  return ROLE_ALIASES[role] || role;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
  file?: any;
  files?: any;
}

export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, email: true },
    });
    if (!user) {
      res.clearCookie('token');
      return res.status(403).json({ message: 'Invalid session. Please sign in again.' });
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: normalizeUserRole(user.role) || user.role,
    };
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  const normalizedRoles = roles.map((role) => normalizeUserRole(role) || role);
  const allowedRoles = Array.from(new Set([
    ...normalizedRoles,
    ...roles,
    ...Object.entries(ROLE_ALIASES)
      .filter(([, normalized]) => normalizedRoles.includes(normalized))
      .map(([alias]) => alias),
  ]));

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const currentRole = normalizeUserRole(req.user?.role);
    if (!req.user || !currentRole || !allowedRoles.includes(currentRole)) {
      return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }
    next();
  };
};
