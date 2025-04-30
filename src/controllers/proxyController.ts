import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import env from '../config/env';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/error-utils';

// Helper function for safe filename creation
function sanitizeFilename(originalFilename: string): string {
  // Replace any potentially problematic characters
  return originalFilename.replace(/[^\w\s.-]/g, '_');
}

export async function inferYOLO(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }
    
    // Sanitize the filename
    const safeFilename = sanitizeFilename(req.file.originalname);
    logger.debug(`YOLO inference: original filename: ${req.file.originalname}, sanitized: ${safeFilename}`);
    
    const form = new FormData();
    form.append('image', req.file.buffer, safeFilename);
    
    logger.info(`Sending inference request to YOLO service at ${env.yoloUrl}`);
    
    try {
      const response = await axios.post(env.yoloUrl, form, { 
        headers: form.getHeaders(),
        timeout: 30000 // 30 second timeout
      });
      logger.info('YOLO inference completed successfully');
      res.json(response.data);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error(`Error calling YOLO inference service: ${errorMessage}`, {
        error,
        statusCode: (error as any).response?.status,
        responseData: (error as any).response?.data
      });
      
      if (error && typeof error === 'object' && 'response' in error) {
        // Server responded with a status code outside of 2xx range
        const axiosError = error as any;
        res.status(axiosError.response.status).json({
          message: `YOLO service error: ${errorMessage}`,
          details: axiosError.response.data
        });
      } else if (error && typeof error === 'object' && 'request' in error) {
        // Request was made but no response was received
        res.status(503).json({ message: 'YOLO service unavailable, please try again later' });
      } else {
        // Something else went wrong
        next(error);
      }
    }
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(err);
    logger.error(`Unexpected error in inferYOLO: ${errorMessage}`, { error: err });
    next(err);
  }
}

export async function estimateRegression(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body;
    logger.info(`Sending regression estimation request to service at ${env.regressionUrl}`);
    
    try {
      const response = await axios.post(env.regressionUrl, payload, {
        timeout: 30000 // 30 second timeout
      });
      logger.info('Regression estimation completed successfully');
      res.json(response.data);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error(`Error calling regression service: ${errorMessage}`, {
        error,
        statusCode: (error as any).response?.status,
        responseData: (error as any).response?.data
      });
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        res.status(axiosError.response.status).json({
          message: `Regression service error: ${errorMessage}`,
          details: axiosError.response.data
        });
      } else if (error && typeof error === 'object' && 'request' in error) {
        res.status(503).json({ message: 'Regression service unavailable, please try again later' });
      } else {
        next(error);
      }
    }
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(err);
    logger.error(`Unexpected error in estimateRegression: ${errorMessage}`, { error: err });
    next(err);
  }
}