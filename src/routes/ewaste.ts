import { Router } from 'express';
import { getAllEwaste, createEwaste } from '../services/ewasteService';
import { isAdmin } from '../middlewares/role';

const router = Router();

/**
 * @swagger
 * /ewaste:
 *   get:
 *     summary: Get all e-waste items
 *     tags: [Ewaste]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: List of e-waste items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   category:
 *                     type: string
 *                   quantity:
 *                     type: number
 *                   estimated_price:
 *                     type: number
 *                   created_at:
 *                     type: string
 *                     format: date-time
 */
router.get('/', isAdmin, getAllEwaste);

router.post('/', isAdmin, createEwaste);

export default router; 