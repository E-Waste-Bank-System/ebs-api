import { Request, Response, NextFunction, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { uploadImage } from '../utils/gcs';
import * as requestService from '../services/requestService';
import { AuthRequest } from '../middlewares/auth';

// Admin handlers
export const getAllRequests: RequestHandler = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0 } = req.query as any;
    const { data, total } = await requestService.getAllRequests(
      Number(limit),
      Number(offset)
    );
    res.json({ data, total });
  } catch (err) {
    next(err);
  }
};

export const approveRequest: RequestHandler = async (req, res, next) => {
  try {
    const updated = await requestService.updateRequestStatus(
      req.params.id,
      'approved'
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const rejectRequest: RequestHandler = async (req, res, next) => {
  try {
    const updated = await requestService.updateRequestStatus(
      req.params.id,
      'rejected'
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// User handlers
export const createRequest: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }
    const { weight, location, pickupDate } = req.body;
    const imageUrl = await uploadImage(
      req.file.buffer,
      `${uuidv4()}_${req.file.originalname}`,
      req.file.mimetype
    );
    const newReq = await requestService.createRequest({
      id: uuidv4(),
      userId: req.user.id,
      weight: Number(weight),
      location,
      pickupDate,
      imageUrl,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(newReq);
  } catch (err) {
    next(err);
  }
};

export const getUserRequests: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user.id;
    const requests = await requestService.getRequestsByUser(userId);
    res.json(requests);
  } catch (err) {
    next(err);
  }
};