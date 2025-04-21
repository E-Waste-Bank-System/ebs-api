import { RequestHandler } from 'express';
import { runInference, runEstimate } from '../services/aiService';
import { v4 as uuidv4 } from 'uuid';

export const inference: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }
    const result = await runInference(
      req.file.buffer,
      `${uuidv4()}_${req.file.originalname}`,
      req.file.mimetype
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const estimatePrice: RequestHandler = async (req, res, next) => {
  try {
    const { category, weight } = req.body;
    const result = await runEstimate(category, weight);
    res.json(result);
  } catch (err) {
    next(err);
  }
};