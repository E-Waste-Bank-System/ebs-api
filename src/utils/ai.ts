import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { AppError } from './error';
import { modelsBucket } from '../config/gcs';
import * as os from 'os';

// Interface for detection results
export interface DetectionResult {
  category: string;
  confidence: number;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

// Interface for price prediction results
export interface PricePredictionResult {
  estimatedPrice: number;
  breakdown: {
    basePrice: number;
    weightFactor: number;
    marketAdjustment: number;
  };
}

// Create a temporary directory for storing the models
const createTempModelDir = async (): Promise<string> => {
  const tempDir = path.join(os.tmpdir(), 'ebs-models');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return tempDir;
};

// Download model from GCS
const downloadModel = async (modelName: string, destPath: string): Promise<void> => {
  // Check if the model already exists locally
  if (fs.existsSync(destPath)) {
    // Check if the file is older than 1 day
    const stats = fs.statSync(destPath);
    const fileAge = new Date().getTime() - stats.mtimeMs;
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    // If file is newer than 1 day, skip download
    if (fileAge < oneDayInMs) {
      return;
    }
  }
  
  // Download the model
  await modelsBucket.file(modelName).download({ destination: destPath });
};

// Run YOLO object detection
export const detectEwaste = async (imagePath: string): Promise<DetectionResult[]> => {
  try {
    // Create temporary model directory
    const modelDir = await createTempModelDir();
    const yoloModelPath = path.join(modelDir, 'yolo_best.pt');
    
    // Download the model if needed
    await downloadModel('yolo/best.pt', yoloModelPath);
    
    // Run Python script
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [
        process.env.PYTHON_SCRIPT_DETECT || 'scripts/detect.py',
        imagePath,
        yoloModelPath
      ]);
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          return reject(new AppError(500, `Detection failed: ${errorOutput}`));
        }
        
        try {
          const results = JSON.parse(output);
          resolve(results);
        } catch (err) {
          reject(new AppError(500, 'Failed to parse detection results'));
        }
      });
    });
  } catch (error) {
    throw new AppError(500, `Detection error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Run price prediction
export const predictPrice = async (category: string, weight: number): Promise<PricePredictionResult> => {
  try {
    // Create temporary model directory
    const modelDir = await createTempModelDir();
    const priceModelPath = path.join(modelDir, 'price_model.pt');
    
    // Download the model if needed
    await downloadModel('regression/price_model.pt', priceModelPath);
    
    // Run Python script
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [
        process.env.PYTHON_SCRIPT_PRICE || 'scripts/predict_price.py',
        category,
        weight.toString(),
        priceModelPath
      ]);
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          return reject(new AppError(500, `Price prediction failed: ${errorOutput}`));
        }
        
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (err) {
          reject(new AppError(500, 'Failed to parse price prediction results'));
        }
      });
    });
  } catch (error) {
    throw new AppError(500, `Price prediction error: ${error instanceof Error ? error.message : String(error)}`);
  }
};