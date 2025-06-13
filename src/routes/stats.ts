import { Router } from 'express';
import { isAdmin } from '../middlewares/auth';
import { ewasteService } from '../services/ewaste';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types/auth';
import { Response } from 'express';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Stats
 *   description: Statistics and analytics endpoints
 */

/**
 * @swagger
 * /stats/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Retrieve statistics for the admin dashboard including user count, e-waste count, and distributions
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: number
 *                   description: Total number of users
 *                 totalEwaste:
 *                   type: number
 *                   description: Total number of e-waste entries
 *                 monthlyStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                         format: YYYY-MM
 *                       count:
 *                         type: number
 *                 categoryDistribution:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                       count:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard', isAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await ewasteService.getStats();
  res.json(stats);
}));

/**
 * @swagger
 * /stats/ewaste:
 *   get:
 *     summary: Get e-waste statistics
 *     description: Retrieve detailed statistics about e-waste including risk levels and category distributions
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: E-waste statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCount:
 *                   type: number
 *                   description: Total number of e-waste entries
 *                 highRiskCount:
 *                   type: number
 *                   description: Number of high-risk e-waste entries (risk_lvl > 7)
 *                 categoryDistribution:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                       count:
 *                         type: number
 *                 riskLevelDistribution:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       riskLevel:
 *                         type: number
 *                       count:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/ewaste', isAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await ewasteService.getDetailedStats();
  res.json(stats);
}));

export default router; 