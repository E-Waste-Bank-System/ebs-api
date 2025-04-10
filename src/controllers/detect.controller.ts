import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { detectEwaste, predictPrice } from '../utils/ai';
import { AppError } from '../utils/error';
import { successResponse } from '../utils/response';

// Detect e-waste from image
export const detectFromImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }

    // Verify that a file was uploaded
    if (!req.file) {
      throw new AppError(400, 'No image uploaded');
    }

    // Create temporary file
    const tempDir = path.join(os.tmpdir(), 'ebs-uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `${uuidv4()}${path.extname(req.file.originalname)}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    try {
      // Run detection
      const detectionResults = await detectEwaste(tempFilePath);

      // Clean up temporary file
      fs.unlinkSync(tempFilePath);

      successResponse(res, 200, 'E-waste detected successfully', {
        results: detectionResults,
        imageUrl: req.fileUrl // From upload middleware
      });
    } catch (error) {
      // Clean up temporary file in case of error
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

// Predict price for e-waste
export const predictEwastePrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized');
    }

    const { category, weight } = req.body;

    // Validate input
    if (!category || category.trim() === '') {
      throw new AppError(400, 'Category is required');
    }

    if (!weight || isNaN(parseFloat(weight))) {
      throw new AppError(400, 'Valid weight is required');
    }

    // Run price prediction
    const predictionResult = await predictPrice(category, parseFloat(weight));

    successResponse(res, 200, 'Price predicted successfully', predictionResult);
  } catch (error) {
    next(error);
  }
}; 