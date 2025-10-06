"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const enhancedDashboardController_1 = require("../controllers/enhancedDashboardController");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(auth_1.authenticateToken);
// Enhanced dashboard routes
router.get('/enhanced', enhancedDashboardController_1.getEnhancedDashboard);
router.get('/live-metrics', enhancedDashboardController_1.getLiveMetrics);
router.get('/product-performance', enhancedDashboardController_1.getProductPerformance);
router.get('/customer-analytics', enhancedDashboardController_1.getCustomerAnalytics);
router.get('/operational-metrics', enhancedDashboardController_1.getOperationalMetrics);
router.post('/generate-insights', enhancedDashboardController_1.generateInsights);
exports.default = router;
