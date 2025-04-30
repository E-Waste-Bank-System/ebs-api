import { Request, Response, NextFunction } from 'express';
import { registerUser, authenticateUser, User, loginWithGoogle, authenticateAdmin } from '../services/authService';
import { signToken } from '../utils/token';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const user: User = await registerUser(email, password);
    const token = signToken({ id: user.id });
    res.status(201).json({ user: { id: user.id, email: user.email }, token });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const user: User = await authenticateUser(email, password);
    const token = signToken({ id: user.id });
    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (err) {
    next(err);
  }
}

export async function loginWithGoogleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { idToken } = req.body;
    const user = await loginWithGoogle(idToken);
    const token = signToken({ id: user.id });
    res.json({ user: { id: user.id, email: user.email, provider: user.provider }, token });
  } catch (err) {
    next(err);
  }
}

export async function loginAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const user = await authenticateAdmin(email, password);
    const token = signToken({ id: user.id });
    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (err) {
    next(err);
  }
}