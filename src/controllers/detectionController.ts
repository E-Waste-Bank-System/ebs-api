import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as detectionService from '../services/detectionService';
import * as retrainingService from '../services/retrainingService';
import { getAllDetectionsWithFilters } from '../services/detectionService';
import { uploadImage } from '../utils/gcs';
import env from '../config/env';
import axios from 'axios';
import { AuthRequest } from '../middlewares/auth';
import FormData from 'form-data';
import supabase from '../utils/supabase';
import logger from '../utils/logger';
import { z } from 'zod';
import { Database } from '../types/supabase';
import { ValidationAction } from '../models/validation';

type Detection = Database['public']['Tables']['objects']['Row'];
type Scan = Database['public']['Tables']['scans']['Row'];

interface DetectionWithScan extends Detection {
  scans: Scan;
}

// Define the ScanWithObjects type
interface ScanWithObjects {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  objects: any[];
}

// Define the parseSuggestionFragments function
function parseSuggestionFragments(suggestion: string): string[] {
  return suggestion.split('|').filter(Boolean);
}

// Validation schemas
const detectionQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  category: z.string().optional(),
  is_validated: z.string().optional().transform(val => val === 'true')
});

const validationSchema = z.object({
  category: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  validated_by: z.string().uuid()
});

interface AIPrediction {
  id: string;
  category: string;
  confidence: number;
  regression_result: number;
  description: string;
  bbox: number[];
  suggestion: string[];
  risk_lvl: number;
  damage_level: number;
  detection_source: string;
}

interface AIResponse {
  predictions: AIPrediction[];
}

export const createDetection = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Upload image to storage and get URL
    const imageUrl = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);

    // Create scan record with metadata
    const scanMetadata = {
      original_filename: req.file.originalname,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      upload_timestamp: new Date().toISOString()
    };

    const scan = await detectionService.createScan(req.user.id, scanMetadata);

    let predictions: AIPrediction[] = [];
    
    try {
      // Send image to AI service
      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });

      const aiResponse = await axios.post<AIResponse>(env.aiUrl, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      predictions = aiResponse.data.predictions || [];
      logger.info('AI service response received', { 
        predictionsCount: predictions.length,
        scanId: scan.id 
      });
    } catch (error: any) {
      logger.error('AI service request failed', {
        error: error?.message || 'Unknown error',
        scanId: scan.id,
        statusCode: error?.response?.status,
        responseData: error?.response?.data
      });
      // Continue with empty predictions array
    }

    const results = [];

    // Process each prediction
    for (const prediction of predictions) {
      const detection = {
        id: uuidv4(),
        user_id: req.user.id,
        scan_id: scan.id,
        image_url: imageUrl,
        category: prediction.category || 'unknown',
        confidence: prediction.confidence || 0,
        regression_result: prediction.regression_result || null,
        description: prediction.description || null,
        suggestion: Array.isArray(prediction.suggestion) ? prediction.suggestion : [],
        risk_lvl: prediction.risk_lvl || null,
        damage_level: prediction.damage_level || null,
        detection_source: prediction.detection_source || 'ai',
        is_validated: false,
        validated_by: null,
        updated_at: new Date().toISOString()
      };

      // Format bbox coordinates as array [x1, y1, x2, y2]
      const bboxCoordinates = prediction.bbox ? [
        prediction.bbox[0],  // x1
        prediction.bbox[1],  // y1
        prediction.bbox[2],  // x2
        prediction.bbox[3]   // y2
      ] : null;

      const result = await detectionService.createDetection(detection, bboxCoordinates);
      results.push(result);
    }

    // If no predictions were made or AI service failed, create a default detection
    if (results.length === 0) {
      logger.info('Creating default detection due to no predictions', { scanId: scan.id });
      const defaultDetection = {
        id: uuidv4(),
        user_id: req.user.id,
        scan_id: scan.id,
        image_url: imageUrl,
        category: 'unknown',
        confidence: 0,
        regression_result: null,
        description: null,
        suggestion: [],
        risk_lvl: null,
        damage_level: null,
        detection_source: 'manual',
        is_validated: false,
        validated_by: null,
        updated_at: new Date().toISOString()
      };

      const result = await detectionService.createDetection(defaultDetection, null);
      results.push(result);
    }

    // Format the response
    const formattedResponse = {
      user_id: req.user.id,
      scan_id: scan.id,
      detections: results.map(result => ({
        id: result.id,
        image_url: result.image_url,
        category: result.category,
        confidence: result.confidence,
        regression_result: result.regression_result,
        risk_lvl: result.risk_lvl,
        damage_level: result.damage_level,
        detection_source: result.detection_source,
        description: result.description,
        suggestion: result.suggestion,
        is_validated: result.is_validated,
        validated_by: result.validated_by,
        created_at: result.created_at,
        updated_at: result.updated_at
      }))
    };

    res.status(201).json(formattedResponse);
  } catch (error) {
    logger.error('Error in createDetection', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    next(error);
  }
};

export const getDetectionsByUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
        statusCode: 401
      });
      return;
    }

    const query = detectionQuerySchema.parse(req.query);
    const result = await detectionService.getDetectionsByUser(userId);

    res.json({
      data: result,
      total: result.length,
      page: query.page || 1,
      limit: query.limit || 10
    });
  } catch (error) {
    next(error);
  }
};

export const getDetectionsByScan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { scanId } = req.params;
    const query = detectionQuerySchema.parse(req.query);
    const result = await detectionService.getDetectionsByScan(scanId);

    res.json({
      data: result,
      total: result.length,
      page: query.page || 1,
      limit: query.limit || 10
    });
  } catch (error) {
    next(error);
  }
};

export const validateDetection = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { objectId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
        statusCode: 401
      });
      return;
    }

    // Accept corrected fields
    const { category, corrected_price, bbox_coordinates, damage_level } = req.body;

    // 1. Fetch detection (object)
    const detection = await detectionService.getDetectionById(objectId);
    if (!detection) {
      res.status(404).json({ message: 'Detection not found' });
      return;
    }

    // 2. Update detection as validated
    const detectionUpdate: {
      is_validated: boolean;
      validated_by: string;
      updated_at: string;
      category?: string;
      damage_level?: number;
    } = {
      is_validated: true,
      validated_by: userId,
      updated_at: new Date().toISOString()
    };
    if (category) detectionUpdate.category = category;
    if (damage_level !== undefined) detectionUpdate.damage_level = damage_level;
    await detectionService.updateDetection(objectId, detectionUpdate);

    // 3. Update retraining_data
    const retrainingData = await retrainingService.getRetrainingDataByObjectId(objectId);
    if (retrainingData) {
      await retrainingService.updateRetrainingData(retrainingData.id, {
        corrected_category: category,
        corrected_price,
        bbox_coordinates,
        is_verified: true,
        verified_by: userId,
        updated_at: new Date().toISOString()
      });
    }

    // 4. Insert validation_history
    if (detection) {
      const validationService = require('../services/validation').default;
      await validationService.createValidationHistory({
        id: uuidv4(),
        object_id: objectId,
        user_id: userId,
        action: ValidationAction.VERIFY,
        previous_category: detection.category,
        new_category: category || detection.category,
        previous_confidence: detection.confidence,
        new_confidence: detection.confidence,
        notes: '',
        created_at: new Date().toISOString()
      });
    }

    res.json({
      message: 'Detection validated, retraining data and validation history updated.'
    });
  } catch (error) {
    next(error);
  }
};

export async function getAllDetections(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const detection_source = req.query.detection_source as string;

    // Build the query
    let query = supabase
      .from('objects')
      .select('*, scans:scans(*)')
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.ilike('category', `%${search}%`);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (detection_source) {
      query = query.eq('detection_source', detection_source);
    }

    // Get paginated results
    const { data: detections, error: detectionsError } = await query
      .range(offset, offset + limit - 1);

    if (detectionsError) {
      throw detectionsError;
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('objects')
      .select('id', { count: 'exact' });

    if (countError) {
      throw countError;
    }

    // --- SUMMARY STATS ---
    // Fetch all objects for summary stats (no pagination)
    const { data: allObjects, error: allObjectsError } = await supabase
      .from('objects')
      .select('*');
    if (allObjectsError) throw allObjectsError;

    // Category distribution
    const categoryDistributionMap = new Map();
    allObjects.forEach(obj => {
      categoryDistributionMap.set(obj.category, (categoryDistributionMap.get(obj.category) || 0) + 1);
    });
    const categoryDistribution = Array.from(categoryDistributionMap.entries()).map(([category, count]) => ({ category, count }));

    // Damage level distribution
    const damageLevelDistributionMap = new Map();
    allObjects.forEach(obj => {
      if (obj.risk_lvl != null) {
        damageLevelDistributionMap.set(obj.risk_lvl, (damageLevelDistributionMap.get(obj.risk_lvl) || 0) + 1);
      }
    });
    const damageLevelDistribution = Array.from(damageLevelDistributionMap.entries()).map(([riskLevel, count]) => ({ riskLevel, count }));

    // Max risk
    const maxRisk = allObjects.reduce((max, obj) => obj.risk_lvl != null && obj.risk_lvl > max ? obj.risk_lvl : max, 0);

    // Unique categories
    const uniqueCategories = categoryDistribution.length;

    // Most recent date
    const mostRecentDate = allObjects.reduce((latest, obj) => {
      if (!obj.created_at) return latest;
      const date = new Date(obj.created_at);
      return (!latest || date > latest) ? date : latest;
    }, null);

    // Group detections by scan
    interface ScanGroup {
      scan_id: string;
      scan: any;
      detections: Array<{
        id: string;
        user_id: string;
        scan_id: string;
        image_url: string;
        category: string;
        confidence: number;
        regression_result: number | null;
        description: string | null;
        suggestion: string[];
        risk_lvl: number;
        bbox_coordinates: {
          x: number;
          y: number;
          width: number;
          height: number;
        } | null;
        is_validated: boolean;
        created_at: string;
        updated_at: string;
        scans?: any;
      }>;
    }

    const scanGroups: Record<string, ScanGroup['detections']> = {};
    if (detections) {
      for (const detection of detections) {
        const scanId = detection.scan_id;
        if (!scanGroups[scanId]) {
          scanGroups[scanId] = [];
        }
        scanGroups[scanId].push(detection);
      }
    }
    const formattedData = Object.entries(scanGroups).map(([scanId, detections]) => ({
      scan_id: scanId,
      scan: detections[0].scans,
      detections: detections.map(d => ({ ...d, scans: undefined }))
    }));

    res.json({
      data: formattedData,
      total: count || 0,
      page,
      limit,
      categoryDistribution,
      damageLevelDistribution,
      maxRisk,
      uniqueCategories,
      mostRecentDate: mostRecentDate ? mostRecentDate.toISOString() : null
    });
  } catch (error) {
    next(error);
  }
}

export async function getDetectionById(req: Request, res: Response, next: NextFunction) {
  try {
    const objectId = req.params.id;
    
    // Get the specific object
    const { data: object, error: objectError } = await supabase
      .from('objects')
      .select(`
        *,
        scan:scans (
          id,
          user_id,
          status,
          created_at,
          updated_at
        )
      `)
      .eq('id', objectId)
      .single();

    if (objectError) {
      throw objectError;
    }

    if (!object) {
      res.status(404).json({ message: 'Detection not found' });
      return;
    }

    // Transform suggestion from pipe-separated string to array with intelligent parsing
    const transformedObject = {
      ...object,
      suggestion: object.suggestion ? parseSuggestionFragments(object.suggestion) : []
    };

    res.json(transformedObject);
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

export async function updateDetection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const fields = req.body;
    
    if (req.user && req.user.id) {
      fields.user_id = req.user.id;
    }
    
    const updated = await detectionService.updateDetection(id, fields);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function updateDetectionImage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }

    const { id } = req.params;
    
    const detection = await detectionService.getDetectionById(id);
    
    if (!detection) {
      res.status(404).json({ message: 'Detection not found' });
      return;
    }
    
    const imageUrl = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    
    const updated = await detectionService.updateDetection(id, { 
      user_id: req.user?.id,
      image_url: imageUrl
    });
    
    res.json(updated);
  } catch (err) {
    next(err);
  }
} 