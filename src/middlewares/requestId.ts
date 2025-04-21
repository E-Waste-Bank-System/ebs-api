import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export default function requestId(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const id = uuidv4();
  res.setHeader('X-Request-Id', id);
  (req as any).id = id;
  next();
}