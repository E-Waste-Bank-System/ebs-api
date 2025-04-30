import { RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as requestService from '../services/requestService';
import { uploadImage } from '../utils/gcs';
import { AuthRequest } from '../middlewares/auth';
import { Response, NextFunction } from 'express';

export const getAllRequests: RequestHandler = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0 } = (req as any).query;
    const { data, total } = await requestService.getAllRequests(Number(limit), Number(offset));
    res.json({ data, total });
  } catch (err) {
    next(err);
  }
};

export const approveRequest: RequestHandler = async (req, res, next) => {
  try {
    const updated = await requestService.updateRequestStatus(req.params.id, 'approved');
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const rejectRequest: RequestHandler = async (req, res, next) => {
  try {
    const updated = await requestService.updateRequestStatus(req.params.id, 'rejected');
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function createRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }
    const imageUrl = await uploadImage(req.file.buffer, `${uuidv4()}_${req.file.originalname}`, req.file.mimetype);
    const { weight, location, pickupDate } = req.body;
    const newReq = await requestService.createRequest({
      id: uuidv4(),
      userId: req.user.id,
      weight: Number(weight),
      location,
      pickupDate,
      imageUrl,
      status: 'pending'
    });
    res.status(201).json(newReq);
  } catch (err) {
    next(err);
  }
}

export async function getUserRequests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await requestService.getRequestsByUser(req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}