import { Router } from 'express';
import { z } from 'zod';
import requireAuth from '../middlewares/auth';
import validate from '../middlewares/validate';
import validateQuery from '../middlewares/validateQuery';
import upload from '../middlewares/upload';
import { getReports, getAllReports, createReport } from '../controllers/reportController';

const router = Router();

const querySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const createReportSchema = z.object({
  content: z.string().min(1),
  quantity: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Quantity must be a positive number"
  }),
  unit: z.string().default('kg'),
  source: z.enum(['manual', 'auto']).default('manual')
});

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Reporting endpoints for e-waste data
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
 *         user_id:
 *           type: string
 *         source:
 *           type: string
 *           enum: [manual, auto]
 *         quantity:
 *           type: number
 *         unit:
 *           type: string
 *           default: kg
 *         image_url:
 *           type: string
 *         content:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     ReportCreate:
 *       type: object
 *       required:
 *         - content
 *         - quantity
 *       properties:
 *         content:
 *           type: string
 *         quantity:
 *           type: number
 *         unit:
 *           type: string
 *           default: kg
 *         source:
 *           type: string
 *           enum: [manual, auto]
 *           default: manual
 *         image:
 *           type: string
 *           format: binary
 */

/**
 * @swagger
 * /reports:
 *   get:
 *     summary: Get all approved e-waste requests
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

/**
 * @swagger
 * /reports/all:
 *   get:
 *     summary: Get all reports (admin)
 *     tags: [Reports]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         required: false
 *     responses:
 *       200:
 *         description: List of all reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 *                 total:
 *                   type: integer
 */
router.get('/all', requireAuth, validateQuery(querySchema), getAllReports);

/**
 * @swagger
 * /reports:
 *   post:
 *     summary: Create a new report
 *     tags: [Reports]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ReportCreate'
 *     responses:
 *       201:
 *         description: Report created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 *       400:
 *         description: Invalid input
 */
router.post('/', requireAuth, upload.single('image'), validate(createReportSchema), createReport);

export default router;