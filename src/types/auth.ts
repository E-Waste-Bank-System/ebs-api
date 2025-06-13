import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthRequest extends Request {
  user?: User;
} 