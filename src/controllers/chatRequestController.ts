import { Request, Response } from 'express';
import { prisma } from '../config/client';
import { logger } from '../utils/logger';
import { emitUserNotification } from './NotificationsController';
import { getSocketService } from '../services/socketService';

export class ChatRequestController {
  // Create a new chat request
  static async createChatRequest(req: Request, res: Response): Promise<void> {
    try {
      const { subject, priority = 'normal' } = req.body;
      const userId = (req as any).user?.publicId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if user already has a pending or active request
      const existingRequest = await prisma.chatRequest.findFirst({
        where: {
          shopOwnerId: userId,
          status: { in: ['pending', 'active'] }
        }
      });

      if (existingRequest) {
        res.status(400).json({ 
          error: 'You already have an active chat request',
          requestId: existingRequest.id,
          status: existingRequest.status
        });
        return;
      }

      const chatRequest = await prisma.chatRequest.create({
        data: {
          shopOwnerId: userId,
          subject,
          priority,
          status: 'pending'
        },
        include: {
          shopOwner: {
            select: {
              id: true,
              name: true,
              email: true,
              publicId: true
            }
          }
        }
      });

      // Notify all admins about new chat request
      const adminUsers = await prisma.user.findMany({
        where: { role: 'Admin' },
        select: { publicId: true, name: true }
      });

      for (const admin of adminUsers) {
        await prisma.notification.create({
          data: {
            userId: admin.publicId,
            type: 'CHAT_REQUEST',
            message: `New chat request from ${chatRequest.shopOwner.name || chatRequest.shopOwner.email}${subject ? `: ${subject}` : ''}`
          }
        });

        // Emit real-time notification
        emitUserNotification(admin.publicId, {
          event: 'chat_request_created',
          notification: {
            type: 'CHAT_REQUEST',
            message: `New chat request from ${chatRequest.shopOwner.name || chatRequest.shopOwner.email}${subject ? `: ${subject}` : ''}`,
            chatRequestId: chatRequest.id
          }
        });
      }

      // Broadcast to admins via WebSocket
      const socketService = getSocketService();
      socketService.broadcastNewChatRequest(chatRequest);

      res.status(201).json({
        success: true,
        data: chatRequest
      });
    } catch (error) {
      logger.error('Error creating chat request:', error);
      res.status(500).json({ error: 'Failed to create chat request' });
    }
  }

  // Get all chat requests (admin only)
  static async getChatRequests(req: Request, res: Response): Promise<void> {
    try {
      const { status, priority } = req.query;
      const userId = (req as any).user?.publicId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { publicId: userId },
        select: { role: true }
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      let whereClause: any = {};

      if (user.role === 'Admin') {
        // Admin can see all requests
        if (status) whereClause.status = status;
        if (priority) whereClause.priority = priority;
      } else {
        // Shop owners can only see their own requests
        whereClause.shopOwnerId = userId;
        if (status) whereClause.status = status;
        if (priority) whereClause.priority = priority;
      }

      const chatRequests = await prisma.chatRequest.findMany({
        where: whereClause,
        include: {
          shopOwner: {
            select: {
              id: true,
              name: true,
              email: true,
              publicId: true,
              role: true
            }
          },
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              publicId: true
            }
          },
          messages: {
            orderBy: { timestamp: 'desc' },
            take: 1,
            select: {
              id: true,
              message: true,
              timestamp: true,
              isRead: true
            }
          },
          _count: {
            select: {
              messages: {
                where: { isRead: false }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: chatRequests
      });
    } catch (error) {
      logger.error('Error fetching chat requests:', error);
      res.status(500).json({ error: 'Failed to fetch chat requests' });
    }
  }

  // Assign chat request to admin
  static async assignChatRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userId = (req as any).user?.publicId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { publicId: userId },
        select: { role: true }
      });

      if (!user || user.role !== 'Admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const chatRequest = await prisma.chatRequest.findUnique({
        where: { id: requestId },
        include: {
          shopOwner: {
            select: {
              name: true,
              email: true,
              publicId: true
            }
          }
        }
      });

      if (!chatRequest) {
        res.status(404).json({ error: 'Chat request not found' });
        return;
      }

      if (chatRequest.status !== 'pending') {
        res.status(400).json({ error: 'Chat request is not pending' });
        return;
      }

      const updatedRequest = await prisma.chatRequest.update({
        where: { id: requestId },
        data: {
          adminId: userId,
          status: 'active'
        },
        include: {
          shopOwner: {
            select: {
              id: true,
              name: true,
              email: true,
              publicId: true
            }
          },
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              publicId: true
            }
          }
        }
      });

      // Notify shop owner that their request has been assigned
      await prisma.notification.create({
        data: {
          userId: chatRequest.shopOwnerId,
          type: 'CHAT_REQUEST',
          message: `Your chat request has been assigned to ${updatedRequest.admin?.name || 'an admin'}`
        }
      });

      emitUserNotification(chatRequest.shopOwnerId, {
        event: 'chat_request_assigned',
        notification: {
          type: 'CHAT_REQUEST',
          message: `Your chat request has been assigned to ${updatedRequest.admin?.name || 'an admin'}`,
          chatRequestId: requestId
        }
      });

      res.json({
        success: true,
        data: updatedRequest
      });
    } catch (error) {
      logger.error('Error assigning chat request:', error);
      res.status(500).json({ error: 'Failed to assign chat request' });
    }
  }

  // Close chat request
  static async closeChatRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userId = (req as any).user?.publicId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const chatRequest = await prisma.chatRequest.findUnique({
        where: { id: requestId }
      });

      if (!chatRequest) {
        res.status(404).json({ error: 'Chat request not found' });
        return;
      }

      // Check if user has permission to close this request
      const user = await prisma.user.findUnique({
        where: { publicId: userId },
        select: { role: true }
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      if (user.role !== 'Admin' && chatRequest.shopOwnerId !== userId) {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }

      const updatedRequest = await prisma.chatRequest.update({
        where: { id: requestId },
        data: { status: 'closed' }
      });

      // Notify the other party
      const otherUserId = user.role === 'Admin' ? chatRequest.shopOwnerId : chatRequest.adminId;
      if (otherUserId) {
        await prisma.notification.create({
          data: {
            userId: otherUserId,
            type: 'CHAT_REQUEST',
            message: 'Chat request has been closed'
          }
        });

        emitUserNotification(otherUserId, {
          event: 'chat_request_closed',
          notification: {
            type: 'CHAT_REQUEST',
            message: 'Chat request has been closed',
            chatRequestId: requestId
          }
        });
      }

      res.json({
        success: true,
        data: updatedRequest
      });
    } catch (error) {
      logger.error('Error closing chat request:', error);
      res.status(500).json({ error: 'Failed to close chat request' });
    }
  }

  // Delete a closed chat request
  static async deleteChatRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userId = (req as any).user?.publicId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const chatRequest = await prisma.chatRequest.findUnique({
        where: { id: requestId }
      });

      if (!chatRequest) {
        res.status(404).json({ error: 'Chat request not found' });
        return;
      }

      // Only allow deletion of closed requests
      if (chatRequest.status !== 'closed') {
        res.status(400).json({ error: 'Can only delete closed chat requests' });
        return;
      }

      // Check if user is admin or the shop owner who created the request
      const user = await prisma.user.findUnique({
        where: { publicId: userId },
        select: { role: true }
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      if (user.role !== 'Admin' && chatRequest.shopOwnerId !== userId) {
        res.status(403).json({ error: 'Not authorized to delete this request' });
        return;
      }

      // Delete associated messages first
      await prisma.chatMessage.deleteMany({
        where: { chatRequestId: requestId }
      });

      // Delete the chat request
      await prisma.chatRequest.delete({
        where: { id: requestId }
      });

      res.json({
        success: true,
        message: 'Chat request deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting chat request:', error);
      res.status(500).json({ error: 'Failed to delete chat request' });
    }
  }

  // Get chat request details
  static async getChatRequestDetails(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userId = (req as any).user?.publicId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const chatRequest = await prisma.chatRequest.findUnique({
        where: { id: requestId },
        include: {
          shopOwner: {
            select: {
              id: true,
              name: true,
              email: true,
              publicId: true,
              role: true
            }
          },
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              publicId: true
            }
          },
          messages: {
            orderBy: { timestamp: 'asc' },
            include: {
              chatRequest: {
                select: {
                  shopOwnerId: true,
                  adminId: true
                }
              }
            }
          }
        }
      });

      if (!chatRequest) {
        res.status(404).json({ error: 'Chat request not found' });
        return;
      }

      // Check permissions
      const user = await prisma.user.findUnique({
        where: { publicId: userId },
        select: { role: true }
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      if (user.role !== 'Admin' && chatRequest.shopOwnerId !== userId) {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }

      res.json({
        success: true,
        data: chatRequest
      });
    } catch (error) {
      logger.error('Error fetching chat request details:', error);
      res.status(500).json({ error: 'Failed to fetch chat request details' });
    }
  }
}
