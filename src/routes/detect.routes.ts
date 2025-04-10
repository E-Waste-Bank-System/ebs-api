import { Router } from 'express';
import { detectFromImage, predictEwastePrice } from '../controllers/detect.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadFile } from '../middlewares/upload.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Detect e-waste from image
router.post('/detect', ...uploadFile('image'), detectFromImage);

// Predict price for e-waste
router.post('/predict-price', predictEwastePrice);

export default router; 