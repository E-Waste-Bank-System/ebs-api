import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as retrainingService from '../services/retrainingService';
import * as detectionService from '../services/detectionService';

/**
 * Creates a validation entry (which actually creates/updates a retraining data entry)
 */
export async function createValidation(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const { object_id, is_accurate, feedback } = req.body;
    
    if (!object_id) {
      res.status(400).json({ message: 'object_id is required' });
      return;
    }
    
    // Get the detection (object) to use for creating or updating retraining data
    const detection = await detectionService.getDetectionById(object_id);
    if (!detection) {
      res.status(404).json({ message: 'Object not found' });
      return;
    }
    
    const retrainingData = await retrainingService.getRetrainingDataByObjectId(object_id);
    
    let result;
    
    if (retrainingData) {
      // If retraining data exists, update it
      const updates: any = { 
        is_verified: true,
        user_id: req.user.id
      };
      
      if (!is_accurate && feedback) {
        updates.corrected_category = feedback;
      } else if (is_accurate) {
        updates.corrected_category = detection.category;
      }
      
      result = await retrainingService.updateRetrainingData(retrainingData.id, updates);
    } else {
      // If retraining data doesn't exist, create it
      result = await retrainingService.createRetrainingData({
        image_url: detection.image_url,
        original_category: detection.category,
        bbox_coordinates: {
          x: 0, // Default values since we don't have bbox data for older detections
          y: 0,
          width: 100,
          height: 100
        },
        confidence_score: detection.confidence || 0,
        corrected_category: !is_accurate && feedback ? feedback : detection.category,
        original_price: detection.regression_result || null,
        corrected_price: !is_accurate && feedback ? null : detection.regression_result || null,
        model_version: detection.detection_source || 'unknown',
        user_id: req.user.id,
        object_id: object_id
      });
    }
    
    // Transform to validation format for backward compatibility
    const validationResponse = {
      id: uuidv4(),
      object_id,
      user_id: req.user.id,
      is_accurate,
      feedback,
      created_at: new Date().toISOString()
    };
    
    res.status(201).json(validationResponse);
  } catch (err) {
    next(err);
  }
}

/**
 * Gets all validation entries (actually getting retraining data)
 */
export async function getAllValidations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Get all retraining data and transform it to validation format
    const { data } = await retrainingService.getAllRetrainingData();
    
    // Transform to validation format for backward compatibility
    const validations = data.map(item => ({
      id: item.id,
      object_id: item.object_id,
      user_id: item.user_id,
      is_accurate: item.corrected_category === item.original_category,
      feedback: item.corrected_category !== item.original_category ? item.corrected_category : null,
      created_at: item.created_at
    }));
    
    res.json(validations);
  } catch (err) {
    next(err);
  }
} 