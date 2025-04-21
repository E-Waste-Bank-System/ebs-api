import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/token';

export interface AuthRequest extends Request {
  user?: any;
}

export default function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
    return;
  }
}