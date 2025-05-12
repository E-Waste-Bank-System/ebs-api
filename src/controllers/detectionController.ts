import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as detectionService from '../services/detectionService';
import { uploadImage } from '../utils/gcs';
import env from '../config/env';
import axios from 'axios';
import { getErrorMessage } from '../utils/error-utils';
import { AuthRequest } from '../middlewares/auth';

export async function createDetection(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }
    // Upload image to GCS
    const imageUrl = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    // Call YOLO API
    const yoloRes = await axios.post<{ label: string; confidence: number }>(env.yoloUrl, { imageUrl });
    const { label, confidence } = yoloRes.data;
    // Call regression API
    const regressionRes = await axios.post<{ price: number }>(env.regressionUrl, { label, confidence });
    const regression_result = regressionRes.data.price;
    // Save detection
    const detection = await detectionService.createDetection({
      id: uuidv4(),
      user_id: req.user.id,
      image_url: imageUrl,
      label,
      confidence,
      regression_result,
    });
    res.status(201).json(detection);
  } catch (err) {
    next(err);
  }
}

export async function getAllDetections(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await detectionService.getAllDetections();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getDetectionsByUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await detectionService.getDetectionsByUser(req.params.userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getDetectionById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await detectionService.getDetectionById(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function deleteDetection(req: Request, res: Response, next: NextFunction) {
  try {
    await detectionService.deleteDetection(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function updateDetection(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const fields = req.body;
    const updated = await detectionService.updateDetection(id, fields);
    res.json(updated);
  } catch (err) {
    next(err);
  }
} 