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

/**
 * @swagger
 * tags:
 *   name: Restock Requests
 *   description: Restock request management endpoints (token required)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RestockRequest:
 *       type: object
 *       required:
 *         - shopId
 *         - productId
 *         - requestedAmount
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated UUID of the restock request
 *         shopId:
 *           type: string
 *           description: ID of the shop requesting restock
 *         productId:
 *           type: string
 *           description: ID of the product to restock
 *         requestedAmount:
 *           type: integer
 *           minimum: 1
 *           description: Amount of product requested
 *         notes:
 *           type: string
 *           description: Additional notes for the request
 *         requestType:
 *           type: string
 *           enum: [RESTOCK, INVENTORY_ADD]
 *           description: Type of request
 *           default: RESTOCK
 *         status:
 *           type: string
 *           enum: [pending, accepted, in_transit, fulfilled, rejected]
 *           description: Current status of the request
 *           default: pending
 *         hidden:
 *           type: boolean
 *           description: Whether the request is hidden (soft deleted)
 *           default: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         shop:
 *           type: object
 *           description: Shop details
 *         product:
 *           type: object
 *           description: Product details
 *       example:
 *         id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *         shopId: "shop-123"
 *         productId: "product-456"
 *         requestedAmount: 50
 *         notes: "Urgent restock needed"
 *         requestType: "RESTOCK"
 *         status: "pending"
 *         hidden: false
 *         createdAt: "2023-05-16T10:30:00Z"
 *         updatedAt: "2023-05-16T10:30:00Z"
 *     RestockRequestCreate:
 *       type: object
 *       required:
 *         - shopId
 *         - productId
 *         - requestedAmount
 *       properties:
 *         shopId:
 *           type: string
 *           description: ID of the shop requesting restock
 *         productId:
 *           type: string
 *           description: ID of the product to restock
 *         requestedAmount:
 *           type: integer
 *           minimum: 1
 *           description: Amount of product requested
 *         notes:
 *           type: string
 *           description: Additional notes for the request
 *         requestType:
 *           type: string
 *           enum: [RESTOCK, INVENTORY_ADD]
 *           description: Type of request
 *           default: RESTOCK
 *     RestockRequestStatusUpdate:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, accepted, in_transit, fulfilled, rejected]
 *           description: New status for the request
 *         notes:
 *           type: string
 *           description: Additional notes for the status change
 *     RestockRequestFulfill:
 *       type: object
 *       required:
 *         - shopId
 *         - productId
 *       properties:
 *         shopId:
 *           type: string
 *           description: ID of the shop
 *         productId:
 *           type: string
 *           description: ID of the product
 */

/**
 * @swagger
 * /api/restock-requests:
 *   post:
 *     summary: Create a new restock request
 *     description: Create a new restock request for a specific shop and product. Shop Owners can only create requests for their managed shops.
 *     tags: [Restock Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RestockRequestCreate'
 *     responses:
 *       201:
 *         description: Restock request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RestockRequest'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied to shop
 *       404:
 *         description: Shop or product not found
 *       500:
 *         description: Internal server error
 */
restockRequestRoutes.post("/", createRestockRequest as RequestHandler);

/**
 * @swagger
 * /api/restock-requests:
 *   get:
 *     summary: Get all restock requests (Admin only)
 *     description: Retrieve all restock requests across all shops. Only accessible by Admin users.
 *     tags: [Restock Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all restock requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RestockRequest'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
restockRequestRoutes.get("/", getAllRestockRequests as RequestHandler);

/**
 * @swagger
 * /api/restock-requests/{shopId}:
 *   get:
 *     summary: Get restock requests by shop
 *     description: Retrieve all restock requests for a specific shop. Shop Owners can only access their managed shops.
 *     tags: [Restock Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop restock requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RestockRequest'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied to shop
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Internal server error
 */
restockRequestRoutes.get("/:shopId", getRestockRequests as RequestHandler);

/**
 * @swagger
 * /api/restock-requests/{id}/approve:
 *   patch:
 *     summary: Approve a restock request
 *     description: Approve a pending restock request and move it to in_transit status. Decrements factory stock.
 *     tags: [Restock Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restock request ID
 *     responses:
 *       200:
 *         description: Restock request approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RestockRequest'
 *       400:
 *         description: Bad request - Request not pending or insufficient stock
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Restock request not found
 *       500:
 *         description: Internal server error
 */
restockRequestRoutes.patch(
  "/:id/approve",
  approveRestockRequest as RequestHandler
);

/**
 * @swagger
 * /api/restock-requests/{id}/reject:
 *   patch:
 *     summary: Reject a restock request
 *     description: Reject a pending restock request with optional notes.
 *     tags: [Restock Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restock request ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Restock request rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RestockRequest'
 *       400:
 *         description: Bad request - Request not pending
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Restock request not found
 *       500:
 *         description: Internal server error
 */
restockRequestRoutes.patch(
  "/:id/reject",
  rejectRestockRequest as RequestHandler
);

/**
 * @swagger
 * /api/restock-requests/{id}/status:
 *   patch:
 *     summary: Update restock request status (Admin only)
 *     description: Update the status of a restock request. Only accessible by Admin users.
 *     tags: [Restock Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restock request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RestockRequestStatusUpdate'
 *     responses:
 *       200:
 *         description: Restock request status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RestockRequest'
 *       400:
 *         description: Bad request - Invalid status or validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Restock request not found
 *       500:
 *         description: Internal server error
 */
restockRequestRoutes.patch(
  "/:id/status",
  updateRestockRequestStatus as RequestHandler
);

/**
 * @swagger
 * /api/restock-requests/fulfill:
 *   post:
 *     summary: Mark restock request as fulfilled
 *     description: Mark a restock request as fulfilled when the order is received. Increments shop inventory.
 *     tags: [Restock Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RestockRequestFulfill'
 *     responses:
 *       200:
 *         description: Restock request marked as fulfilled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RestockRequest'
 *       400:
 *         description: Bad request - No pending request found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied to shop
 *       404:
 *         description: Shop or product not found
 *       500:
 *         description: Internal server error
 */
restockRequestRoutes.post(
  "/fulfill",
  markRestockRequestFulfilled as RequestHandler
);

/**
 * @swagger
 * /api/restock-requests/{id}:
 *   delete:
 *     summary: Hide restock request (Admin only)
 *     description: Soft delete a restock request by hiding it from the UI. Only accessible by Admin users.
 *     tags: [Restock Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restock request ID
 *     responses:
 *       200:
 *         description: Restock request hidden successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 request:
 *                   $ref: '#/components/schemas/RestockRequest'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Restock request not found
 *       500:
 *         description: Internal server error
 */
restockRequestRoutes.delete(
  "/:id",
  softDeleteRestockRequest as RequestHandler
);

export default restockRequestRoutes;
