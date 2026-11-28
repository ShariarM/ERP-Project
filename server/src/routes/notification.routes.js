import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { getMyNotifications, readMyNotification } from '../controllers/notification.controller.js';

const router = Router();
router.use(verifyToken);
router.get('/', getMyNotifications);
router.patch('/:id/read', readMyNotification);
export default router;
