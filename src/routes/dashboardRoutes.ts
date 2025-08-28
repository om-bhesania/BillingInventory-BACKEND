import { Router, RequestHandler } from "express";
import { DashboardController } from "../controllers/dashboardController";
import verifyJWT from "../middlewares/VerifyJWT";
import { checkAccess } from "../middlewares/ErrorHandlers/checkAccess";
import { dashboardRateLimiter, dashboardRefreshRateLimiter } from "../middlewares/rateLimiter";

const router = Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

// Get dashboard metrics based on user role (with general dashboard rate limiting)
router.get(
  "/metrics",
  dashboardRateLimiter,
  checkAccess("Dashboard", "read"),
  DashboardController.getDashboardMetrics as unknown as RequestHandler
);

// Get recent activities for dashboard (with general dashboard rate limiting)
router.get(
  "/activities",
  dashboardRateLimiter,
  checkAccess("Dashboard", "read"),
  DashboardController.getRecentActivities as unknown as RequestHandler
);

// Dashboard refresh endpoint (with strict refresh rate limiting - once every 5 minutes)
router.post(
  "/refresh",
  dashboardRefreshRateLimiter,
  checkAccess("Dashboard", "read"),
  DashboardController.getDashboardMetrics as unknown as RequestHandler
);

export default router;
