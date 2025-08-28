import { Router, RequestHandler } from "express";
import { LowStockController } from "../controllers/lowStockController";
import verifyJWT from "../middlewares/VerifyJWT";
import { checkAccess } from "../middlewares/ErrorHandlers/checkAccess";
import { userRateLimiter } from "../middlewares/rateLimiter";

const router = Router();

// Apply JWT verification and rate limiting to all routes
router.use(verifyJWT);
router.use(userRateLimiter);

// Get low stock alerts with pagination and filtering
router.get(
  "/",
  checkAccess("Low Stock Alerts", "read"),
  LowStockController.getLowStockAlerts as unknown as RequestHandler
);

// Get low stock statistics
router.get(
  "/stats",
  checkAccess("Low Stock Alerts", "read"),
  LowStockController.getLowStockStats as unknown as RequestHandler
);

// Get available filters for low stock alerts
router.get(
  "/filters",
  checkAccess("Low Stock Alerts", "read"),
  LowStockController.getLowStockFilters as unknown as RequestHandler
);

export default router;
