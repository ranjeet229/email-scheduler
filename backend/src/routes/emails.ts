import { Router } from 'express';
import * as emailController from '../controllers/emailController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/scheduled', requireAuth, emailController.getScheduled);
router.get('/sent', requireAuth, emailController.getSent);

export default router;
