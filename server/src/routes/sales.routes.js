import { Router } from 'express';
import * as s from '../controllers/sales.controller.js';
import { verifyToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(verifyToken);

// Marketing has no access to sales data. Who may do each STATUS step is decided
// in workflow.service.js (sales confirms, accounting invoices and marks paid).
const salesTeam = requireRole('admin', 'accounting', 'sales');
router.get('/', salesTeam, s.list);
router.get('/summary', salesTeam, s.summary);
router.post('/', salesTeam, s.create);
router.patch('/:id/status', salesTeam, s.updateStatus);

export default router;
