import { Router } from 'express';
import requireAuth from '../middlewares/auth';
import { getReports } from '../controllers/reportController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Reporting endpoints for approved requests
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Report:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         content:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /reports:
 *   get:
 *     summary: Get all approved e-waste requests (report)
 *     tags: [Reports]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: List of approved requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Report'
 */
router.get('/', requireAuth, getReports);

export default router;