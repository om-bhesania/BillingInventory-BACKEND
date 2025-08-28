"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const restockRequestController_1 = require("../controllers/restockRequestController");
const auth_1 = require("../middlewares/auth");
const restockRequestRoutes = express_1.default.Router();
// Apply authentication middleware to all routes
restockRequestRoutes.use(auth_1.authenticateToken);
// Restock request routes
restockRequestRoutes.post("/", restockRequestController_1.createRestockRequest);
restockRequestRoutes.get("/", restockRequestController_1.getAllRestockRequests); // Admin: Get all restock requests
restockRequestRoutes.get("/:shopId", restockRequestController_1.getRestockRequests); // Shop specific requests
restockRequestRoutes.patch("/:id/approve", restockRequestController_1.approveRestockRequest);
restockRequestRoutes.patch("/:id/reject", restockRequestController_1.rejectRestockRequest);
restockRequestRoutes.patch("/:id/status", restockRequestController_1.updateRestockRequestStatus); // Admin: Update status (accepted, in_transit, etc.)
restockRequestRoutes.post("/fulfill", restockRequestController_1.markRestockRequestFulfilled); // Shop Owner/Admin: Mark as fulfilled when order received
restockRequestRoutes.delete("/:id", restockRequestController_1.softDeleteRestockRequest); // Admin: Hide restock request (soft delete - keeps in DB)
exports.default = restockRequestRoutes;
