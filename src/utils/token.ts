import jwt from 'jsonwebtoken';
import env from '../config/env';

export function signToken(payload: object): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, env.JWT_SECRET);
}