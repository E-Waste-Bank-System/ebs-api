import { Request, Response, NextFunction } from 'express';
import * as ewasteService from '../services/ewasteService';

export async function getAllEwaste(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await ewasteService.getAllEwaste();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function createEwaste(req: Request, res: Response, next: NextFunction) {
  try {
    const { detection_id, user_id, name, category, quantity, estimated_price, image_url } = req.body;
    const ewaste = await ewasteService.createEwaste({
      detection_id,
      user_id,
      name,
      category,
      quantity,
      estimated_price,
      image_url,
    });
    res.status(201).json(ewaste);
  } catch (err) {
    next(err);
  }
} 