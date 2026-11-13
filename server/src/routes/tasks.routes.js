import { Router } from 'express';
import * as tasks from '../controllers/tasks.controller.js';
import { verifyToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(verifyToken);
router.get('/', tasks.list);
router.get('/users', requireRole('admin'), tasks.listUsers);
router.post('/', requireRole('admin'), tasks.create);
router.patch('/:id/status', tasks.updateStatus);

export default router;
