"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const fileUploadService_1 = require("../services/fileUploadService");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(authMiddleware_1.authenticateToken);
// Upload receipt for restock request
router.post('/receipt/:restockRequestId', fileUploadService_1.upload.single('receipt'), fileUploadService_1.handleUploadError, paymentController_1.PaymentController.uploadReceipt);
// Verify payment (admin only)
router.patch('/verify/:restockRequestId', paymentController_1.PaymentController.verifyPayment);
// Get receipt file (admin only)
router.get('/receipt/:filename', paymentController_1.PaymentController.getReceipt);
// Get payment verification queue (admin only)
router.get('/queue', paymentController_1.PaymentController.getPaymentQueue);
// Get shop financials
router.get('/financials/:shopId', paymentController_1.PaymentController.getShopFinancials);
exports.default = router;
