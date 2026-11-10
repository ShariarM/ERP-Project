import { Router } from 'express';
import * as att from '../controllers/attendance.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();
router.use(verifyToken);
router.post('/clock-in', att.clockIn);
router.post('/clock-out', att.clockOut);
router.get('/my-logs', att.getMyAttendance);

export default router;