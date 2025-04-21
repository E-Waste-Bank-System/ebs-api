import { Request, Response, NextFunction, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as articleService from '../services/articleService';
import { uploadImage } from '../utils/gcs';

export const getAll: RequestHandler = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0 } = req.query as any;
    const { data, total } = await articleService.getAll(Number(limit), Number(offset));
    res.json({ data, total });
  } catch (err) {
    next(err);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const article = await articleService.getById(req.params.id);
    res.json(article);
  } catch (err) {
    next(err);
  }
};

export const createArticle: RequestHandler = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }
    const imageUrl = await uploadImage(
      req.file.buffer,
      `${uuidv4()}_${req.file.originalname}`,
      req.file.mimetype
    );
    const newArticle = await articleService.create({
      id: uuidv4(),
      title,
      content,
      imageUrl,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(newArticle);
  } catch (err) {
    next(err);
  }
};

export const updateArticle: RequestHandler = async (req, res, next) => {
  try {
    const fields: any = { ...req.body };
    if (req.file) {
      fields.imageUrl = await uploadImage(
        req.file.buffer,
        `${uuidv4()}_${req.file.originalname}`,
        req.file.mimetype
      );
    }
    const updated = await articleService.update(req.params.id, fields);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteArticle: RequestHandler = async (req, res, next) => {
  try {
    await articleService.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};