import { Router } from 'express';
import requireAuth from '../middlewares/auth';
import { getReports } from '../controllers/reportController';

const router = Router();

/**
 * @openapi
 * /api/reports:
 *   get:
 *     tags:
 *      - Reports
 *     summary: Retrieve approved e-waste requests report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Approved requests list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EWasteRequest'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', requireAuth, getReports);

export default router;