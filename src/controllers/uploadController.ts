import { Request, Response, NextFunction } from 'express';
import { uploadImage } from '../utils/gcs';

export async function uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }
    const imageUrl = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.status(201).json({ url: imageUrl });
  } catch (err) {
    next(err);
  }
} 