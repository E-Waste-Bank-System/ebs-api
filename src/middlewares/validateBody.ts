import { AnyZodObject } from 'zod';
import { RequestHandler } from 'express';

export default function validateBody(schema: AnyZodObject): RequestHandler {
  return (req, res, next) => {
    try {
      const validatedBody = schema.parse(req.body);
      req.body = validatedBody;
      next();
    } catch (err: any) {
      res.status(400).json({ message: err.errors || err.message });
      return;
    }
  };
} 