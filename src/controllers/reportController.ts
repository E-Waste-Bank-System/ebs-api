import { RequestHandler } from 'express';
import * as reportService from '../services/reportService';

export const getReports: RequestHandler = async (req, res, next) => {
  try {
    const data = await reportService.getApprovedRequests();
    res.json(data);
  } catch (err: unknown) {
    next(err);
  }
};