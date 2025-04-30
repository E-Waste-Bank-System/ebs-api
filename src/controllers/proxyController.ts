import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import env from '../config/env';

export async function inferYOLO(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }
    const form = new FormData();
    form.append('image', req.file.buffer, req.file.originalname);
    const response = await axios.post(env.yoloUrl, form, { headers: form.getHeaders() });
    res.json(response.data);
  } catch (err) {
    next(err);
  }
}

export async function estimateRegression(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body;
    const response = await axios.post(env.regressionUrl, payload);
    res.json(response.data);
  } catch (err) {
    next(err);
  }
}