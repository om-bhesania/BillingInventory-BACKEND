import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { upload, handleUploadError } from '../services/fileUploadService';

const router = Router();

// All routes require authentication
router.use(authenticateToken as any);

// Upload receipt for restock request
router.post('/receipt/:restockRequestId', 
  upload.single('receipt'), 
  handleUploadError,
  PaymentController.uploadReceipt
);

// Verify payment (admin only)
router.patch('/verify/:restockRequestId', PaymentController.verifyPayment);

// Get receipt file (admin only)
router.get('/receipt/:filename', PaymentController.getReceipt);

// Get payment verification queue (admin only)
router.get('/queue', PaymentController.getPaymentQueue);

// Get shop financials
router.get('/financials/:shopId', PaymentController.getShopFinancials);

export default router;
