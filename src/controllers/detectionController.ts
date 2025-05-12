import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as detectionService from '../services/detectionService';
import { uploadImage } from '../utils/gcs';
import env from '../config/env';
import axios from 'axios';
import { getErrorMessage } from '../utils/error-utils';
import { AuthRequest } from '../middlewares/auth';
import FormData from 'form-data';

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
    // Call YOLO API (cv_model/predict) with multipart/form-data
    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);
    const yoloRes = await axios.post(env.yoloUrl, formData, {
      headers: formData.getHeaders(),
    });
    const yoloData = yoloRes.data as any;
    const yoloPred = yoloData.predictions && yoloData.predictions[0];
    const category = yoloPred?.class ? String(yoloPred.class) : '';
    const confidence = yoloPred?.confidence ?? null;
    // Call regression API (optional, fallback to null)
    let regression_result: number | undefined = undefined;
    try {
      if (category && confidence !== null) {
        const regressionRes = await axios.post(env.regressionUrl, { label: category, confidence });
        const regressionData = regressionRes.data as any;
        regression_result = regressionData.price;
      }
    } catch (err) {
      regression_result = undefined;
    }
    // Call Gemini API for validation, description, suggestion, risk_lvl
    let description: string | undefined = undefined, suggestion: string[] = [], risk_lvl: number | undefined = undefined, validatedCategory: string = category;
    try {
      const geminiRes = await axios.post(env.geminiUrl, {
        image_url: imageUrl,
        yolo_result: yoloData.predictions,
        prompt: "Validate the e-waste category, provide up to 3 short suggestions, a description (max 40 words), and a risk level (1-10)."
      }, {
        headers: { 'Authorization': `Bearer ${env.geminiApiKey}` }
      });
      const geminiData = geminiRes.data as any;
      validatedCategory = geminiData.validated_category ?? category;
      description = geminiData.description ?? undefined;
      suggestion = Array.isArray(geminiData.suggestion) ? geminiData.suggestion : (geminiData.suggestion ? [geminiData.suggestion] : []);
      risk_lvl = geminiData.risk_lvl ?? undefined;
      // Enforce limits
      if (description) {
        description = description.split(' ').slice(0, 40).join(' ');
      }
      if (Array.isArray(suggestion)) {
        suggestion = suggestion.slice(0, 3);
      }
      if (typeof risk_lvl === 'number') {
        risk_lvl = Math.max(1, Math.min(10, Math.round(risk_lvl)));
      }
    } catch (err) {
      description = undefined;
      suggestion = [];
      risk_lvl = undefined;
      validatedCategory = category;
    }
    // Save detection
    const detection = await detectionService.createDetection({
      id: uuidv4(),
      user_id: req.user.id,
      image_url: imageUrl,
      category: validatedCategory,
      confidence,
      regression_result,
      description,
      suggestion: suggestion.join(' | '), // Store as string, or change DB to array if supported
      risk_lvl,
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