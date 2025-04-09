import { Request, Response } from 'express';
import { spawn } from 'child_process';
import { AppError } from '../middlewares/error.middleware';

export const detectEwaste = async (req: Request, res: Response) => {
  const image = req.file?.path;

  if (!image) {
    throw new AppError(400, 'Image is required');
  }

  const pythonProcess = spawn('python', ['detect.py', image]);

  let result = '';
  let error = '';

  pythonProcess.stdout.on('data', (data) => {
    result += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    error += data.toString();
  });

  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({
        status: 'error',
        message: 'Detection failed',
        error
      });
    }

    try {
      const detectionResult = JSON.parse(result);
      res.json({
        status: 'success',
        data: detectionResult
      });
    } catch (err) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to parse detection result'
      });
    }
  });
};

export const predictPrice = async (req: Request, res: Response) => {
  const { category, weight } = req.body;

  const pythonProcess = spawn('python', ['predict.py', category, weight]);

  let result = '';
  let error = '';

  pythonProcess.stdout.on('data', (data) => {
    result += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    error += data.toString();
  });

  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({
        status: 'error',
        message: 'Prediction failed',
        error
      });
    }

    try {
      const predictionResult = JSON.parse(result);
      res.json({
        status: 'success',
        data: predictionResult
      });
    } catch (err) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to parse prediction result'
      });
    }
  });
}; 