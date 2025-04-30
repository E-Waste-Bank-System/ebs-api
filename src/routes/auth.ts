import { Router } from 'express';
import { register, login, loginWithGoogleHandler, loginAdmin } from '../controllers/authController';
import validate from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
const googleSchema = z.object({ idToken: z.string().min(1) });

router.post('/register', validate(authSchema), register);
router.post('/login', validate(authSchema), login);
router.post('/login/google', validate(googleSchema), loginWithGoogleHandler);
router.post('/login/admin', validate(authSchema), loginAdmin);

export default router;