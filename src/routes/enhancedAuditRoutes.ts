import { Router } from 'express';
import { EnhancedAuditController } from '../controllers/enhancedAuditController';
import { authenticateToken } from '../middlewares/auth';
import { isAdmin } from '../config/roles';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken as any);

// Get all audit events with filtering
router.get('/events', EnhancedAuditController.getAuditEvents);

// Get security events specifically
router.get('/security', EnhancedAuditController.getSecurityEvents);

// Get audit statistics
router.get('/statistics', EnhancedAuditController.getAuditStatistics);

// Get security dashboard data
router.get('/security/dashboard', EnhancedAuditController.getSecurityDashboard);

// Get user activity summary
router.get('/user-activity', EnhancedAuditController.getUserActivity);

// Get system performance metrics
router.get('/system-metrics', EnhancedAuditController.getSystemMetrics);

// Export audit events (admin only)
router.post('/export', (req, res, next) => {
  if (isAdmin(req.user?.role || '')) {
    return EnhancedAuditController.exportAuditEvents(req, res);
  }
  res.status(403).json({ error: 'Admin access required' });
});

// Cleanup old audit events (admin only)
router.post('/cleanup', (req, res, next) => {
  if (isAdmin(req.user?.role || '')) {
    return EnhancedAuditController.cleanupAuditEvents(req, res);
  }
  res.status(403).json({ error: 'Admin access required' });
});

export default router;
