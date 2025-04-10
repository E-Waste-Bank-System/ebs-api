import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getProfile,
  updateProfile,
  uploadEwaste,
  getTransactions,
  getSchedules,
  confirmSchedule
} from '../controllers/user.controller';
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

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/ewaste', upload.single('image'), uploadEwaste);
router.get('/transactions', getTransactions);
router.get('/schedules', getSchedules);
router.patch('/schedules/:id/confirm', confirmSchedule);

export default router; 