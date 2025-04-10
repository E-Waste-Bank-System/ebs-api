import { spawn } from 'child_process';
import { AppError } from './error';

export const detectEwasteFromImage = (imagePath: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', ['detect.py', imagePath]);
    
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
        reject(new AppError(500, 'Detection failed: ' + error));
        return;
      }

      try {
        const detectionResult = JSON.parse(result);
        resolve(detectionResult);
      } catch (err) {
        reject(new AppError(500, 'Failed to parse detection result'));
      }
    });
  });
};

export const predictEwastePrice = (category: string, weight: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', ['predict.py', category, weight.toString()]);
    
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
        reject(new AppError(500, 'Price prediction failed: ' + error));
        return;
      }

      try {
        const prediction = JSON.parse(result);
        resolve(prediction.price);
      } catch (err) {
        reject(new AppError(500, 'Failed to parse prediction result'));
      }
    });
  });
};