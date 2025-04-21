import { Router } from 'express';
import { z } from 'zod';
import validate from '../middlewares/validate';
import requireAuth from '../middlewares/auth';
import { login, logout, signup, profile } from '../controllers/authController';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Admin login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', validate(loginSchema), login);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Admin logout
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', requireAuth, logout);

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     tags:
 *       - Auth
 *     summary: User signup
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: Signup successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/signup', validate(signupSchema), signup);

/**
 * @openapi
 * /api/auth/profile:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/profile', requireAuth, profile);

export default router;