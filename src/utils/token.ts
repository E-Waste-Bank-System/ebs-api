import jwt from 'jsonwebtoken';
import env from '../config/env';

export interface TokenPayload { id: string; user?: { id: string; email: string; is_admin: boolean } }

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
}