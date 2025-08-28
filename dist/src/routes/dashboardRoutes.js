"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const VerifyJWT_1 = __importDefault(require("../middlewares/VerifyJWT"));
const checkAccess_1 = require("../middlewares/ErrorHandlers/checkAccess");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
// Apply JWT verification and dashboard-specific rate limiting to all routes
router.use(VerifyJWT_1.default);
router.use(rateLimiter_1.dashboardRateLimiter);
// Get dashboard metrics based on user role
router.get("/metrics", (0, checkAccess_1.checkAccess)("Dashboard", "read"), dashboardController_1.DashboardController.getDashboardMetrics);
// Get recent activities for dashboard
router.get("/activities", (0, checkAccess_1.checkAccess)("Dashboard", "read"), dashboardController_1.DashboardController.getRecentActivities);
exports.default = router;
