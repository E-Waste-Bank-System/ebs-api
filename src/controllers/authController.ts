import { Request, Response, NextFunction } from 'express';
import supabase from '../utils/supabase';
import { isAdminUser, getUserById } from '../services/authService';
import { signToken } from '../utils/token';

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login as admin (Supabase Auth email/password)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     is_admin:
 *                       type: boolean
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }
    // Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const user_id = data.user.id;
    // Check if user is admin
    const isAdmin = await isAdminUser(user_id);
    if (!isAdmin) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const token = signToken({ id: user_id, user: { id: user_id, email, is_admin: true } });
    res.json({ user: { id: user_id, email, is_admin: true }, token });
  } catch (err: unknown) {
    next(err);
  }
}

/**
 * @swagger
 * /auth/token:
 *   post:
 *     summary: Get authentication token using Supabase user_id
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid user_id
 */
export async function getToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      res.status(400).json({ message: 'user_id is required' });
      return;
    }
    // Fetch user info from DB
    const user = await getUserById(user_id);
    if (!user) {
      res.status(401).json({ message: 'Invalid user_id' });
      return;
    }
    const token = signToken({ id: user.id, user: { id: user.id, email: user.email, is_admin: false } });
    res.json({ user: { id: user.id }, token });
  } catch (err: unknown) {
    next(err);
  }
}