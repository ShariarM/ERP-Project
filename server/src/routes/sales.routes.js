import { Router } from 'express';
import * as s from '../controllers/sales.controller.js';
import { verifyToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(verifyToken, requireRole('admin', 'accounting')); // sales/accounting data: admin + accounting only
router.get('/', s.list);
router.get('/summary', s.summary);
router.post('/', s.create);
router.delete('/:id', s.remove);
export default router;
