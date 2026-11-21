import { Router } from 'express';
import * as inventory from '../controllers/inventory.controller.js';
import { verifyToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(verifyToken);

router.get('/products', requireRole('admin', 'accounting', 'sales'), inventory.getProducts);
router.get('/low-stock', requireRole('admin', 'accounting', 'sales'), inventory.getLowStock);
router.get('/movements', requireRole('admin', 'accounting'), inventory.getStockMovements);
router.post('/products', requireRole('admin', 'accounting'), inventory.createProduct);
router.post('/movements', requireRole('admin', 'accounting'), inventory.addStockMovement);

export default router;