import sanitize from 'mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

export default function sanitizeBody(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.body) {
    req.body = sanitize(req.body);
  }
  next();
}