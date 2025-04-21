import { RequestHandler } from 'express';
import * as reportService from '../services/reportService';

export const getReports: RequestHandler = async (_req, res, next) => {
  try {
    const reports = await reportService.getReports();
    res.json(reports);
  } catch (err) {
    next(err);
  }
};