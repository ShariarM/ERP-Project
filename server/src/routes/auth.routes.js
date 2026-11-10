import { Router } from 'express';
import { login, me, signup, heartbeat, logout, activeUsers } from '../controllers/auth.controller.js';
import { verifyToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.post('/login', login);
router.post('/signup', signup);
router.get('/me', verifyToken, me);

// online/offline tracking
router.post('/heartbeat', verifyToken, heartbeat);
router.post('/logout', verifyToken, logout);
router.get('/active-users', verifyToken, requireRole('admin'), activeUsers); // admin only

export default router;
