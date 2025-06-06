import { Request, Response, NextFunction } from 'express';
import requireAuth, { AuthRequest } from './auth';

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, next);
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const authReq = req as AuthRequest;
    if (authReq.user?.user?.is_admin) {
      next();
    } else {
      res.status(403).json({ message: 'Admin access required' });
    }
  });
} 