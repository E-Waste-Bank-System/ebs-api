import { Router } from 'express';
import requireAuth from '../middlewares/auth';
import { getReports } from '../controllers/reportController';

const router = Router();

router.get('/', requireAuth, getReports);

export default router;