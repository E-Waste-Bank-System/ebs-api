import { AnyZodObject } from 'zod';
import { RequestHandler } from 'express';

export default function validateQuery(schema: AnyZodObject): RequestHandler {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err: any) {
      res.status(400).json({ message: err.errors || err.message });
      return;
    }
  };
}