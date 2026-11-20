import { Router } from 'express';
import * as att from '../controllers/attendance.controller.js';
import { verifyToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyToken);

router.post('/clock-in', att.clockIn);
router.post('/clock-out', att.clockOut);
router.get('/my-logs', att.getMyAttendance);
router.get('/summary', att.getAttendanceSummary);
router.get('/team-summary', requireRole('admin'), att.getTeamSummary);

export default router;