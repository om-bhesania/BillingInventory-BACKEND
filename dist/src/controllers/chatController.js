"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const client_1 = require("../config/client");
const logger_1 = require("../utils/logger");
const socketService_1 = require("../services/socketService");
class ChatController {
    // Get chat messages for a specific room
    static async getChatMessages(req, res) {
        try {
            const { room } = req.params;
            const { limit = 50, offset = 0 } = req.query;
            const user = req.user;
            if (!user) {
                res.status(401).json({
                    success: false,
                    error: 'User not authenticated'
                });
                return;
            }
            // Extract chat request ID from room name
            const chatRequestId = room.replace('chat-request-', '');
            // Verify user has access to this chat request
            const chatRequest = await client_1.prisma.chatRequest.findUnique({
                where: { id: chatRequestId },
                select: { shopOwnerId: true, adminId: true }
            });
            if (!chatRequest) {
                res.status(404).json({
                    success: false,
                    error: 'Chat request not found'
                });
                return;
            }
            // Check if user is either the shop owner or the assigned admin
            const hasAccess = chatRequest.shopOwnerId === user.publicId ||
                chatRequest.adminId === user.publicId ||
                user.role === 'Admin';
            if (!hasAccess) {
                res.status(403).json({
                    success: false,
                    error: 'Access denied to this chat request'
                });
                return;
            }
            const messages = await client_1.prisma.chatMessage.findMany({
                where: { room },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset)
            });
            // Get user details for each message
            const messagesWithUsers = await Promise.all(messages.map(async (message) => {
                const user = await client_1.prisma.user.findUnique({
                    where: { publicId: message.userId },
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        publicId: true
                    }
                });
                return {
                    id: message.id,
                    message: message.message,
                    senderId: message.userId,
                    senderName: user?.name || 'Unknown User',
                    senderRole: user?.role || 'Unknown',
                    timestamp: message.timestamp,
                    isRead: message.isRead,
                    room: message.room
                };
            }));
            res.json(messagesWithUsers.reverse()); // Return in chronological order
        }
        catch (error) {
            logger_1.logger.error('Error getting chat messages:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get chat messages'
            });
        }
    }
    // Send a chat message
    static async sendMessage(req, res) {
        try {
            const { message, room } = req.body;
            const user = req.user;
            if (!user) {
                res.status(401).json({
                    success: false,
                    error: 'User not authenticated'
                });
                return;
            }
            // Extract chat request ID from room name
            const chatRequestId = room.replace('chat-request-', '');
            // Check if this is an admin sending their first message to a pending chat request
            if (user.role === 'Admin') {
                const chatRequest = await client_1.prisma.chatRequest.findUnique({
                    where: { id: chatRequestId },
                    select: { id: true, status: true, adminId: true, shopOwnerId: true }
                });
                // If chat request is pending and not assigned to this admin, auto-assign and activate it
                if (chatRequest && chatRequest.status === 'pending' && chatRequest.adminId !== user.publicId) {
                    await client_1.prisma.chatRequest.update({
                        where: { id: chatRequestId },
                        data: {
                            adminId: user.publicId,
                            status: 'active'
                        }
                    });
                    // Notify shop owner that their request has been assigned
                    await client_1.prisma.notification.create({
                        data: {
                            userId: chatRequest.shopOwnerId,
                            type: 'CHAT_REQUEST',
                            message: `Your chat request has been assigned to ${user.name || 'an admin'}`
                        }
                    });
                    // Emit real-time notification to shop owner
                    const socketService = (0, socketService_1.getSocketService)();
                    socketService.emitToUser(chatRequest.shopOwnerId, 'chat_request_assigned', {
                        event: 'chat_request_assigned',
                        notification: {
                            type: 'CHAT_REQUEST',
                            message: `Your chat request has been assigned to ${user.name || 'an admin'}`,
                            chatRequestId: chatRequestId
                        },
                        chatRequest: {
                            id: chatRequestId,
                            status: 'active',
                            adminId: user.publicId
                        }
                    });
                    // Broadcast chat request status update to all admins
                    socketService.emitToRole('Admin', 'chat_request_status_updated', {
                        event: 'chat_request_status_updated',
                        chatRequest: {
                            id: chatRequestId,
                            status: 'active',
                            adminId: user.publicId
                        },
                        timestamp: new Date().toISOString()
                    });
                }
            }
            const chatMessage = await client_1.prisma.chatMessage.create({
                data: {
                    message,
                    room,
                    userId: user.publicId // Use publicId since userId in schema is String
                }
            });
            // Get user details for response
            const userDetails = await client_1.prisma.user.findUnique({
                where: { publicId: user.publicId },
                select: {
                    id: true,
                    name: true,
                    role: true,
                    publicId: true
                }
            });
            const responseData = {
                id: chatMessage.id,
                message: chatMessage.message,
                senderId: chatMessage.userId,
                senderName: userDetails?.name || 'Unknown User',
                senderRole: userDetails?.role || 'Unknown',
                timestamp: chatMessage.timestamp,
                isRead: chatMessage.isRead,
                room: chatMessage.room
            };
            // Broadcast message to room via Socket.IO
            const socketService = (0, socketService_1.getSocketService)();
            socketService.emitToRoom(room, 'chat:message:new', responseData);
            res.json(responseData);
        }
        catch (error) {
            logger_1.logger.error('Error sending chat message:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send message'
            });
        }
    }
    // Get all chat rooms for admin
    static async getChatRooms(req, res) {
        try {
            const { role } = req.query;
            const user = req.user;
            if (!user) {
                res.status(401).json({
                    success: false,
                    error: 'User not authenticated'
                });
                return;
            }
            // Get chat requests that the user has access to
            let chatRequests;
            if (user.role === 'Admin') {
                // Admin can see all chat requests
                chatRequests = await client_1.prisma.chatRequest.findMany({
                    select: { id: true, shopOwnerId: true, adminId: true }
                });
            }
            else {
                // Shop owner can only see their own chat requests
                chatRequests = await client_1.prisma.chatRequest.findMany({
                    where: { shopOwnerId: user.publicId },
                    select: { id: true, shopOwnerId: true, adminId: true }
                });
            }
            // Get rooms for these chat requests
            const roomNames = chatRequests.map(req => `chat-request-${req.id}`);
            // Get all unique rooms with latest message info
            const rooms = await client_1.prisma.chatMessage.groupBy({
                by: ['room'],
                where: { room: { in: roomNames } },
                _max: {
                    createdAt: true
                },
                _count: {
                    id: true
                }
            });
            // Get room details with user info
            const roomDetails = await Promise.all(rooms.map(async (room) => {
                const latestMessage = await client_1.prisma.chatMessage.findFirst({
                    where: { room: room.room },
                    orderBy: { createdAt: 'desc' }
                });
                // Extract chat request ID from room name
                const chatRequestId = room.room.replace('chat-request-', '');
                // Get chat request details
                const chatRequest = await client_1.prisma.chatRequest.findUnique({
                    where: { id: chatRequestId },
                    include: {
                        shopOwner: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                                publicId: true
                            }
                        },
                        admin: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                                publicId: true
                            }
                        }
                    }
                });
                // Determine which user to show based on the requesting user's role
                let displayUser;
                if (user.role === 'Admin') {
                    displayUser = chatRequest?.shopOwner;
                }
                else {
                    displayUser = chatRequest?.admin;
                }
                return {
                    room: room.room,
                    user: displayUser,
                    latestMessage: latestMessage?.message,
                    latestMessageTime: latestMessage?.createdAt,
                    messageCount: room._count.id,
                    unreadCount: 0 // Since we don't have isRead field, assume all messages are read
                };
            }));
            // Filter by role if specified
            const filteredRooms = role && role !== 'all'
                ? roomDetails.filter(room => room.user?.role === role)
                : roomDetails;
            res.json(filteredRooms);
        }
        catch (error) {
            logger_1.logger.error('Error getting chat rooms:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get chat rooms'
            });
        }
    }
    // Mark messages as read
    static async markAsRead(req, res) {
        try {
            const { room } = req.params;
            const user = req.user;
            if (!user) {
                res.status(401).json({
                    success: false,
                    error: 'User not authenticated'
                });
                return;
            }
            // Extract chat request ID from room name
            const chatRequestId = room.replace('chat-request-', '');
            // Verify user has access to this chat request
            const chatRequest = await client_1.prisma.chatRequest.findUnique({
                where: { id: chatRequestId },
                select: { shopOwnerId: true, adminId: true }
            });
            if (!chatRequest) {
                res.status(404).json({
                    success: false,
                    error: 'Chat request not found'
                });
                return;
            }
            // Check if user is either the shop owner or the assigned admin
            const hasAccess = chatRequest.shopOwnerId === user.publicId ||
                chatRequest.adminId === user.publicId ||
                user.role === 'Admin';
            if (!hasAccess) {
                res.status(403).json({
                    success: false,
                    error: 'Access denied to this chat request'
                });
                return;
            }
            // Mark all messages in the room as read for this user
            await client_1.prisma.chatMessage.updateMany({
                where: {
                    room: room,
                    userId: { not: user.publicId } // Don't mark own messages as read
                },
                data: { isRead: true }
            });
            res.json({
                success: true,
                message: 'Messages marked as read'
            });
        }
        catch (error) {
            logger_1.logger.error('Error marking messages as read:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to mark messages as read'
            });
        }
    }
    // Get unread message count for user
    static async getUnreadCount(req, res) {
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({
                    success: false,
                    error: 'User not authenticated'
                });
                return;
            }
            // Get chat requests that the user has access to
            let chatRequests;
            if (user.role === 'Admin') {
                // Admin can see all chat requests
                chatRequests = await client_1.prisma.chatRequest.findMany({
                    select: { id: true }
                });
            }
            else {
                // Shop owner can only see their own chat requests
                chatRequests = await client_1.prisma.chatRequest.findMany({
                    where: { shopOwnerId: user.publicId },
                    select: { id: true }
                });
            }
            // Get rooms for these chat requests
            const roomNames = chatRequests.map(req => `chat-request-${req.id}`);
            // Count unread messages for this user in accessible rooms
            const unreadCount = await client_1.prisma.chatMessage.count({
                where: {
                    room: { in: roomNames },
                    userId: { not: user.publicId }, // Messages not from this user
                    isRead: false
                }
            });
            res.json({ unreadCount });
        }
        catch (error) {
            logger_1.logger.error('Error getting unread count:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get unread count'
            });
        }
    }
}
exports.ChatController = ChatController;
