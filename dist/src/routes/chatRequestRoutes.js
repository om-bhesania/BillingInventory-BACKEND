"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatRequestController_1 = require("../controllers/chatRequestController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// Create a new chat request
router.post('/', chatRequestController_1.ChatRequestController.createChatRequest);
// Get all chat requests
router.get('/', chatRequestController_1.ChatRequestController.getChatRequests);
// Get specific chat request details
router.get('/:requestId', chatRequestController_1.ChatRequestController.getChatRequestDetails);
// Assign chat request to admin
router.patch('/:requestId/assign', chatRequestController_1.ChatRequestController.assignChatRequest);
// Close chat request
router.patch('/:requestId/close', chatRequestController_1.ChatRequestController.closeChatRequest);
// Delete closed chat request
router.delete('/:requestId', chatRequestController_1.ChatRequestController.deleteChatRequest);
exports.default = router;
