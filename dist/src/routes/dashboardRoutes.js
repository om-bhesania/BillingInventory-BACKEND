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
// Apply JWT verification to all routes
router.use(VerifyJWT_1.default);
// Get dashboard metrics based on user role (with general dashboard rate limiting)
router.get("/metrics", rateLimiter_1.dashboardRateLimiter, (0, checkAccess_1.checkAccess)("Dashboard", "read"), dashboardController_1.DashboardController.getDashboardMetrics);
// Get recent activities for dashboard (with general dashboard rate limiting)
router.get("/activities", rateLimiter_1.dashboardRateLimiter, (0, checkAccess_1.checkAccess)("Dashboard", "read"), dashboardController_1.DashboardController.getRecentActivities);
// Dashboard refresh endpoint (with strict refresh rate limiting - once every 5 minutes)
router.post("/refresh", rateLimiter_1.dashboardRefreshRateLimiter, (0, checkAccess_1.checkAccess)("Dashboard", "read"), dashboardController_1.DashboardController.getDashboardMetrics);
exports.default = router;
