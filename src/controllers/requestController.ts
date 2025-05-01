import { RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as requestService from '../services/requestService';
import { uploadImage } from '../utils/gcs';
import { AuthRequest } from '../middlewares/auth';
import { Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/error-utils';

// Helper function for safe filename creation
function createSafeFilename(originalFilename: string): string {
  // Extract file extension
  const extension = originalFilename.includes('.') 
    ? originalFilename.split('.').pop() 
    : '';
  // Create a safe filename with UUID and clean extension
  return `request_${uuidv4()}${extension ? '.' + extension.replace(/[^\w.-]/g, '') : ''}`;
}

export const getAllRequests: RequestHandler = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0 } = (req as any).query;
    const { data, total } = await requestService.getAllRequests(Number(limit), Number(offset));
    res.json({ data, total });
  } catch (err: unknown) {
    next(err);
  }
};

export const approveRequest: RequestHandler = async (req, res, next) => {
  try {
    const updated = await requestService.updateRequestStatus(req.params.id, 'approved');
    res.json(updated);
  } catch (err: unknown) {
    next(err);
  }
};

export const rejectRequest: RequestHandler = async (req, res, next) => {
  try {
    const updated = await requestService.updateRequestStatus(req.params.id, 'rejected');
    res.json(updated);
  } catch (err: unknown) {
    next(err);
  }
}

export async function createRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }
    
    // Use safe filename generation
    const safeFilename = createSafeFilename(req.file.originalname);
    logger.debug(`Original filename: ${req.file.originalname}, Safe filename: ${safeFilename}`);
    
    const imageUrl = await uploadImage(
      req.file.buffer, 
      safeFilename, 
      req.file.mimetype
    );
    
    const { weight, location, pickupDate } = req.body;
    const newReq = await requestService.createRequest({
      id: uuidv4(),
      user_id: req.user.id,
      weight: Number(weight),
      location,
      pickup_date: pickupDate,
      image_url: imageUrl,
      status: 'pending'
    });
    res.status(201).json(newReq);
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(err);
    logger.error(`Error creating request: ${errorMessage}`, { error: err });
    next(err);
  }
}

export async function getUserRequests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await requestService.getRequestsByUser(req.user.id);
    res.json(data);
  } catch (err: unknown) {
    next(err);
  }
}