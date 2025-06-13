import { Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest } from '../types/auth';

export const isAdmin: RequestHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const isAuthenticated: RequestHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}; 