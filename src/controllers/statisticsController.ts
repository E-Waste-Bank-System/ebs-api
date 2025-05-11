import { Request, Response, NextFunction } from 'express';
import * as statisticsService from '../services/statisticsService';

export async function getStatistics(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await statisticsService.getStatistics();
    res.json(stats);
  } catch (err) {
    next(err);
  }
} 