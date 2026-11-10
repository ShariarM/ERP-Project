import { Router } from 'express';
import * as c from '../controllers/customer.controller.js';
import { verifyToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(verifyToken);

// marketing + accounting may READ customers (marketing page count, Record Sale dropdown)
router.get('/', requireRole('admin', 'sales', 'marketing', 'accounting'), c.list);
router.get('/:id', requireRole('admin', 'sales', 'marketing', 'accounting'), c.get);

// only admin + sales may change customer data
router.post('/', requireRole('admin', 'sales'), c.create);
router.put('/:id', requireRole('admin', 'sales'), c.update);
router.delete('/:id', requireRole('admin', 'sales'), c.remove);

export default router;
