import { RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as reportService from '../services/reportService';
import { AuthRequest } from '../middlewares/auth';
import { Response, NextFunction } from 'express';
import { uploadImage } from '../utils/gcs';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/error-utils';

// Helper function for safe filename creation
function createSafeFilename(originalFilename: string): string {
  const extension = originalFilename.includes('.') 
    ? originalFilename.split('.').pop() 
    : '';
  return `report_${uuidv4()}${extension ? '.' + extension.replace(/[^\w.-]/g, '') : ''}`;
}

export const getReports: RequestHandler = async (req, res, next) => {
  try {
    const data = await reportService.getApprovedRequests();
    res.json(data);
  } catch (err: unknown) {
    next(err);
  }
};

export const getAllReports: RequestHandler = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0 } = (req as any).query;
    const { data, total } = await reportService.getAllReports(Number(limit), Number(offset));
    res.json({ data, total });
  } catch (err: unknown) {
    next(err);
  }
};

export const createReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let imageUrl: string | undefined;
    
    if (req.file) {
      const safeFilename = createSafeFilename(req.file.originalname);
      imageUrl = await uploadImage(
        req.file.buffer,
        safeFilename,
        req.file.mimetype
      );
    }
    
    const { content, quantity, unit = 'kg', source = 'manual' } = req.body;
    
    const newReport = await reportService.createReport({
      id: uuidv4(),
      user_id: req.user.id,
      source,
      quantity: Number(quantity),
      unit,
      image_url: imageUrl,
      content
    });
    
    res.status(201).json(newReport);
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(err);
    logger.error(`Error creating report: ${errorMessage}`, { error: err });
    next(err);
  }
};