import { Request, Response, NextFunction } from 'express';
import { isAdminUser } from '../services/authService';
import { signToken } from '../utils/token';

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with Supabase Auth user_id
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
 *                     is_admin:
 *                       type: boolean
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    // Assume Supabase Auth is used for login, and user_id is available after login
    const { user_id } = req.body; // This should come from Supabase Auth JWT
    const isAdmin = await isAdminUser(user_id);
    const token = signToken({ id: user_id, is_admin: isAdmin });
    res.json({ user: { id: user_id, is_admin: isAdmin }, token });
  } catch (err: unknown) {
    next(err);
  }
}