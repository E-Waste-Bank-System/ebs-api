import { Request, Response, NextFunction } from 'express';
import * as retrainingService from '../services/retrainingService';
import { AuthRequest } from '../middlewares/auth';

export async function createRetrainingEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      image_url,
      original_category,
      bbox_coordinates,
      confidence_score,
      model_version,
      user_id,
      object_id,
      original_price,
      corrected_price
    } = req.body;

    // Validate required fields
    if (!image_url || !original_category || !bbox_coordinates || 
        !model_version || !user_id || !object_id) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const data = await retrainingService.createRetrainingData({
      image_url,
      original_category,
      bbox_coordinates,
      confidence_score: parseFloat(confidence_score) || 0,
      corrected_category: null,
      original_price: original_price ? parseFloat(original_price) : null,
      corrected_price: corrected_price ? parseFloat(corrected_price) : null,
      model_version,
      user_id,
      object_id
    });

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function getAllRetrainingData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    const filters = {
      is_verified: req.query.is_verified === 'true' ? true : 
                   req.query.is_verified === 'false' ? false : undefined,
      model_version: req.query.model_version as string,
      confidence_below: req.query.confidence_below ? 
                        parseFloat(req.query.confidence_below as string) : undefined,
      category: req.query.category as string
    };

    const { data, total, last_page } = await retrainingService.getAllRetrainingData(
      limit,
      offset,
      filters
    );

    res.json({
      data,
      total,
      current_page: page,
      last_page,
      per_page: limit
    });
  } catch (err) {
    next(err);
  }
}

export async function getRetrainingDataById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = await retrainingService.getRetrainingDataById(id);
    
    if (!data) {
      res.status(404).json({ message: 'Retraining data not found' });
      return;
    }
    
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function updateRetrainingData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Get existing data to check if it exists
    const existingData = await retrainingService.getRetrainingDataById(id);
    if (!existingData) {
      res.status(404).json({ message: 'Retraining data not found' });
      return;
    }
    
    // Update the data
    const updated = await retrainingService.updateRetrainingData(id, updates);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function verifyRetrainingData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { corrected_category } = req.body;
    
    if (!corrected_category) {
      res.status(400).json({ message: 'Corrected category is required' });
      return;
    }
    
    // Update with verification data
    const updated = await retrainingService.updateRetrainingData(id, {
      corrected_category,
      is_verified: true,
      user_id: req.user?.id as string
    });
    
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteRetrainingData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await retrainingService.deleteRetrainingData(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getUnverifiedSamples(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await retrainingService.getUnverifiedSamples(limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function exportVerifiedData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await retrainingService.exportVerifiedData();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getRetrainingDataByObjectId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { object_id } = req.params;
    const data = await retrainingService.getRetrainingDataByObjectId(object_id);
    
    if (!data) {
      res.status(404).json({ message: 'No retraining data found for this object' });
      return;
    }
    
    res.json(data);
  } catch (err) {
    next(err);
  }
}