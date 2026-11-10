import { Router } from 'express';
import * as leave from '../controllers/leave.controller.js';
import { verifyToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(verifyToken);
router.post('/apply', leave.applyLeave);
router.get('/', leave.getLeaves);
router.put('/:id/status', requireRole('admin'), leave.updateLeaveStatus); // admin only

export default router;
