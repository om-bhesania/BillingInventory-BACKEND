import express, { RequestHandler } from "express";

import { authenticateToken } from "../middlewares/auth";
import {
  createBilling,
  getBillingById,
  getBillings,
  getBillingStats,
  updateBillingPaymentStatus,
} from "../controllers/billingController";

const billingRoutes = express.Router();

// Apply authentication middleware to all routes
billingRoutes.use(authenticateToken as any);

// Billing routes
billingRoutes.post("/", createBilling as RequestHandler);
billingRoutes.get("/:shopId", getBillings as RequestHandler);
billingRoutes.get("/:shopId/stats", getBillingStats as RequestHandler);
billingRoutes.get("/billing/:id", getBillingById as RequestHandler);
billingRoutes.patch("/billing/:id/payment-status", updateBillingPaymentStatus as RequestHandler);

export default billingRoutes;
