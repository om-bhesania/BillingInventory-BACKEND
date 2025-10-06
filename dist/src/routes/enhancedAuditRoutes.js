"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const enhancedAuditController_1 = require("../controllers/enhancedAuditController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
// Get all audit events with filtering
router.get('/events', enhancedAuditController_1.EnhancedAuditController.getAuditEvents);
// Get security events specifically
router.get('/security', enhancedAuditController_1.EnhancedAuditController.getSecurityEvents);
// Get audit statistics
router.get('/statistics', enhancedAuditController_1.EnhancedAuditController.getAuditStatistics);
// Get security dashboard data
router.get('/security/dashboard', enhancedAuditController_1.EnhancedAuditController.getSecurityDashboard);
// Get user activity summary
router.get('/user-activity', enhancedAuditController_1.EnhancedAuditController.getUserActivity);
// Get system performance metrics
router.get('/system-metrics', enhancedAuditController_1.EnhancedAuditController.getSystemMetrics);
// Export audit events (admin only)
router.post('/export', (req, res, next) => {
    if ((0, roles_1.isAdmin)(req.user?.role || '')) {
        return enhancedAuditController_1.EnhancedAuditController.exportAuditEvents(req, res);
    }
    res.status(403).json({ error: 'Admin access required' });
});
// Cleanup old audit events (admin only)
router.post('/cleanup', (req, res, next) => {
    if ((0, roles_1.isAdmin)(req.user?.role || '')) {
        return enhancedAuditController_1.EnhancedAuditController.cleanupAuditEvents(req, res);
    }
    res.status(403).json({ error: 'Admin access required' });
});
exports.default = router;
