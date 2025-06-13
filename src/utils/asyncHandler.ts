import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest } from '../types/auth';

type AsyncRequestHandler = (
  req: Request | AuthRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const asyncAuthHandler = asyncHandler; 