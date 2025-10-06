"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stockAdjustmentController_1 = require("../controllers/stockAdjustmentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(authMiddleware_1.authenticateToken);
// Create stock adjustment request
router.post('/', stockAdjustmentController_1.StockAdjustmentController.createStockAdjustment);
// Get stock adjustment requests
router.get('/', stockAdjustmentController_1.StockAdjustmentController.getStockAdjustments);
// Get stock adjustment details
router.get('/:adjustmentId', stockAdjustmentController_1.StockAdjustmentController.getStockAdjustmentDetails);
// Update stock adjustment status (admin only)
router.patch('/:adjustmentId/status', stockAdjustmentController_1.StockAdjustmentController.updateStockAdjustmentStatus);
// Get default adjustment reasons
router.get('/reasons/default', stockAdjustmentController_1.StockAdjustmentController.getDefaultReasons);
exports.default = router;
