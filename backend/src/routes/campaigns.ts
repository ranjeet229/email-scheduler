import { Router } from 'express';
import * as campaignController from '../controllers/campaignController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, campaignController.postCampaign);

export default router;
