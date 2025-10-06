import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getEnhancedDashboard,
  getLiveMetrics,
  getProductPerformance,
  getCustomerAnalytics,
  getOperationalMetrics,
  generateInsights
} from '../controllers/enhancedDashboardController';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Enhanced dashboard routes
router.get('/enhanced', getEnhancedDashboard);
router.get('/live-metrics', getLiveMetrics);
router.get('/product-performance', getProductPerformance);
router.get('/customer-analytics', getCustomerAnalytics);
router.get('/operational-metrics', getOperationalMetrics);
router.post('/generate-insights', generateInsights);

export default router;
