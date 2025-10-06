"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Get chat messages for a specific room
router.get('/messages/:room', auth_1.authenticateToken, chatController_1.ChatController.getChatMessages);
// Send a chat message
router.post('/send', auth_1.authenticateToken, chatController_1.ChatController.sendMessage);
// Get all chat rooms (admin only)
router.get('/rooms', auth_1.authenticateToken, chatController_1.ChatController.getChatRooms);
// Mark messages as read
router.put('/read/:room', auth_1.authenticateToken, chatController_1.ChatController.markAsRead);
// Get unread message count
router.get('/unread-count', auth_1.authenticateToken, chatController_1.ChatController.getUnreadCount);
exports.default = router;
