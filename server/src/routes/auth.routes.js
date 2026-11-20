import { Router } from 'express';
import { syncUser, me, heartbeat, logout, activeUsers } from '../controllers/auth.controller.js';
import { verifyFirebaseToken, verifyToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Signup/login themselves happen in the browser with Firebase.
router.post('/sync-user', verifyFirebaseToken, syncUser);   // new account -> create the MySQL row
router.get('/me', verifyToken, me);

// online/offline tracking
router.post('/heartbeat', verifyToken, heartbeat);
router.post('/logout', verifyToken, logout);
router.get('/active-users', verifyToken, requireRole('admin'), activeUsers); // admin only

export default router;
