import { Router } from 'express';
import { StockAdjustmentController } from '../controllers/stockAdjustmentController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken as any);

// Create stock adjustment request
router.post('/', StockAdjustmentController.createStockAdjustment);

// Get stock adjustment requests
router.get('/', StockAdjustmentController.getStockAdjustments);

// Get stock adjustment details
router.get('/:adjustmentId', StockAdjustmentController.getStockAdjustmentDetails);

// Update stock adjustment status (admin only)
router.patch('/:adjustmentId/status', StockAdjustmentController.updateStockAdjustmentStatus);

// Get default adjustment reasons
router.get('/reasons/default', StockAdjustmentController.getDefaultReasons);

export default router;
