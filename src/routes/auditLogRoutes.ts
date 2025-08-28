import { Router, RequestHandler } from "express";
import { AuditLogController } from "../controllers/auditLogController";
import verifyJWT from "../middlewares/VerifyJWT";
import { checkAccess } from "../middlewares/ErrorHandlers/checkAccess";
import { userRateLimiter } from "../middlewares/rateLimiter";

const router = Router();

// Apply JWT verification and rate limiting to all routes
router.use(verifyJWT);
router.use(userRateLimiter);

// Get audit log entries with pagination and filtering
router.get(
  "/",
  checkAccess("Audit Log", "read"),
  AuditLogController.getAuditLog as unknown as RequestHandler
);

// Get audit log statistics
router.get(
  "/stats",
  checkAccess("Audit Log", "read"),
  AuditLogController.getAuditLogStats as unknown as RequestHandler
);

export default router;
