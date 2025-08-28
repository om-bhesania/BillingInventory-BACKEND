"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlewares/auth");
const billingController_1 = require("../controllers/billingController");
const billingRoutes = express_1.default.Router();
// Apply authentication middleware to all routes
billingRoutes.use(auth_1.authenticateToken);
// Billing routes
billingRoutes.post("/", billingController_1.createBilling);
billingRoutes.get("/:shopId", billingController_1.getBillings);
billingRoutes.get("/:shopId/stats", billingController_1.getBillingStats);
billingRoutes.get("/billing/:id", billingController_1.getBillingById);
billingRoutes.patch("/billing/:id/payment-status", billingController_1.updateBillingPaymentStatus);
exports.default = billingRoutes;
