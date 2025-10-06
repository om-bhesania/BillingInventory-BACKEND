import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Get chat messages for a specific room
router.get('/messages/:room', authenticateToken, ChatController.getChatMessages);

// Send a chat message
router.post('/send', authenticateToken, ChatController.sendMessage);

// Get all chat rooms (admin only)
router.get('/rooms', authenticateToken, ChatController.getChatRooms);

// Mark messages as read
router.put('/read/:room', authenticateToken, ChatController.markAsRead);

// Get unread message count
router.get('/unread-count', authenticateToken, ChatController.getUnreadCount);

export default router;
