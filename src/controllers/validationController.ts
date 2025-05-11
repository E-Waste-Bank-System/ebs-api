import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as validationService from '../services/validationService';

export async function createValidation(req: any, res: Response, next: NextFunction) {
  try {
    const { detection_id, is_accurate, feedback } = req.body;
    const validation = await validationService.createValidation({
      id: uuidv4(),
      detection_id,
      user_id: req.user.id,
      is_accurate,
      feedback,
    });
    res.status(201).json(validation);
  } catch (err) {
    next(err);
  }
}

export async function getAllValidations(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await validationService.getAllValidations();
    res.json(data);
  } catch (err) {
    next(err);
  }
} 