import jwt from 'jsonwebtoken';
import env from '../config/env';

export interface TokenPayload { id: string; [key: string]: any; }

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
}