import { Router } from 'express';
import requireAuth from '../middlewares/auth';
import upload from '../middlewares/upload';
import { inferYOLO, estimateRegression } from '../controllers/proxyController';

const router = Router();

router.post('/yolo', requireAuth, upload.single('image'), inferYOLO);
router.post('/regression', requireAuth, estimateRegression);

export default router;