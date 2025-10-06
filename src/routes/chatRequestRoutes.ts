import { Router } from 'express';
import { ChatRequestController } from '../controllers/chatRequestController';
import { authenticateToken } from '../middlewares/auth';
 
const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Create a new chat request
router.post('/', ChatRequestController.createChatRequest);

// Get all chat requests
router.get('/', ChatRequestController.getChatRequests);

// Get specific chat request details
router.get('/:requestId', ChatRequestController.getChatRequestDetails);

// Assign chat request to admin
router.patch('/:requestId/assign', ChatRequestController.assignChatRequest);

// Close chat request
router.patch('/:requestId/close', ChatRequestController.closeChatRequest);

// Delete closed chat request
router.delete('/:requestId', ChatRequestController.deleteChatRequest);

export default router;
