import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export default function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
}