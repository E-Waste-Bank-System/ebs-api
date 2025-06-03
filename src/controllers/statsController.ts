import { Request, Response, NextFunction } from 'express';
import * as statsService from '../services/statsService';
import { isAdmin } from '../middlewares/role';

export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await statsService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

export async function getEwasteStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await statsService.getEwasteStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
} 