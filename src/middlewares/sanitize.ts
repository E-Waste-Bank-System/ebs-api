import { Request, Response, NextFunction } from 'express';
import xssFilters from 'xss-filters';

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return xssFilters.inHTMLData(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitizedObj: any = {};
    for (const key in obj) {
      sanitizedObj[key] = sanitizeObject(obj[key]);
    }
    return sanitizedObj;
  }
  return obj;
}

export default function sanitize(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // For query and params, create sanitized copies without modifying the original
  if (req.query && typeof req.query === 'object') {
    (req as any).sanitizedQuery = sanitizeObject(req.query);
  }
  
  if (req.params && typeof req.params === 'object') {
    (req as any).sanitizedParams = sanitizeObject(req.params);
  }
  
  next();
}