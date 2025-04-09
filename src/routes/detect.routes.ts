import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { detectEwaste, predictPrice } from '../controllers/detect.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.use(authenticate);

router.post('/detect', upload.single('image'), detectEwaste);
router.post('/predict-price', predictPrice);

export default router; 