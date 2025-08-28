import express, { RequestHandler } from "express";
import {
  createRestockRequest,
  getRestockRequests,
  getAllRestockRequests,
  approveRestockRequest,
  rejectRestockRequest,
  updateRestockRequestStatus,
  markRestockRequestFulfilled,
  softDeleteRestockRequest,
} from "../controllers/restockRequestController";
import { authenticateToken } from "../middlewares/auth";

const restockRequestRoutes = express.Router();

// Apply authentication middleware to all routes
restockRequestRoutes.use(authenticateToken as any);

// Restock request routes
restockRequestRoutes.post("/", createRestockRequest as RequestHandler);
restockRequestRoutes.get("/", getAllRestockRequests as RequestHandler); // Admin: Get all restock requests
restockRequestRoutes.get("/:shopId", getRestockRequests as RequestHandler); // Shop specific requests
restockRequestRoutes.patch(
  "/:id/approve",
  approveRestockRequest as RequestHandler
);
restockRequestRoutes.patch(
  "/:id/reject",
  rejectRestockRequest as RequestHandler
);
restockRequestRoutes.patch(
  "/:id/status",
  updateRestockRequestStatus as RequestHandler
); // Admin: Update status (accepted, in_transit, etc.)
restockRequestRoutes.post(
  "/fulfill",
  markRestockRequestFulfilled as RequestHandler
); // Shop Owner/Admin: Mark as fulfilled when order received
restockRequestRoutes.delete(
  "/:id",
  softDeleteRestockRequest as RequestHandler
); // Admin: Hide restock request (soft delete - keeps in DB)

export default restockRequestRoutes;
