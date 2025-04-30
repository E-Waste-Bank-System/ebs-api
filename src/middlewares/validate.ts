import { AnyZodObject } from 'zod';
import { RequestHandler } from 'express';

export default function validate(schema: AnyZodObject): RequestHandler {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err: any) {
      res.status(400).json({ message: err.errors || err.message });
      return;
    }
  };
}