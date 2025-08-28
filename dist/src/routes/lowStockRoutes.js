"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lowStockController_1 = require("../controllers/lowStockController");
const VerifyJWT_1 = __importDefault(require("../middlewares/VerifyJWT"));
const checkAccess_1 = require("../middlewares/ErrorHandlers/checkAccess");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
// Apply JWT verification and rate limiting to all routes
router.use(VerifyJWT_1.default);
router.use(rateLimiter_1.userRateLimiter);
// Get low stock alerts with pagination and filtering
router.get("/", (0, checkAccess_1.checkAccess)("Low Stock Alerts", "read"), lowStockController_1.LowStockController.getLowStockAlerts);
// Get low stock statistics
router.get("/stats", (0, checkAccess_1.checkAccess)("Low Stock Alerts", "read"), lowStockController_1.LowStockController.getLowStockStats);
// Get available filters for low stock alerts
router.get("/filters", (0, checkAccess_1.checkAccess)("Low Stock Alerts", "read"), lowStockController_1.LowStockController.getLowStockFilters);
exports.default = router;
