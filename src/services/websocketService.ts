import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { prisma as sharedPrisma } from '../config/client';

const prisma = sharedPrisma ?? new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userName?: string;
}

interface UserPresence {
  userId: string;
  userName: string;
  userRole: string;
  isOnline: boolean;
  lastSeen: Date;
  currentPage?: string;
  isTyping?: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  room: string;
  type: 'text' | 'system' | 'notification';
}

interface LiveDataUpdate {
  type: 'dashboard' | 'inventory' | 'restock' | 'billing' | 'analytics';
  data: any;
  timestamp: Date;
}

class EnhancedWebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private userPresence: Map<string, UserPresence> = new Map();
  private chatRooms: Map<string, ChatMessage[]> = new Map();
  private liveDataSubscribers: Map<string, Set<string>> = new Map(); // dataType -> Set of socketIds

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startLiveDataBroadcast();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = (socket as any).handshake.auth.token || (socket as any).handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        
        // Get user details from database
        const user = await prisma.user.findUnique({
          where: { publicId: decoded.publicId },
          select: { publicId: true, role: true, name: true }
        });

        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        (socket as AuthenticatedSocket).userId = user.publicId;
        (socket as AuthenticatedSocket).userRole = user.role || 'User';
        (socket as AuthenticatedSocket).userName = user.name || 'Unknown User';
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      console.log(`🔌 User ${authSocket.userId} (${authSocket.userName}) connected via WebSocket`);

      // Join user to their personal room
      if (authSocket.userId) {
        socket.join(`user:${authSocket.userId}`);
        this.addUserConnection(authSocket.userId, socket.id);
        this.updateUserPresence(authSocket.userId, authSocket.userName!, authSocket.userRole!, true);

        // Join role-based rooms
        if (authSocket.userRole) {
          socket.join(`role:${authSocket.userRole}`);
        }

        // Join global chat room
        socket.join('global:chat');

        // Send connection confirmation with user list
        socket.emit('connected', {
          message: 'Connected to real-time system',
          userId: authSocket.userId,
          role: authSocket.userRole,
          onlineUsers: this.getOnlineUsers(),
          timestamp: new Date()
        });

        // Broadcast user online status
        this.broadcastUserPresence();
      }

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 User ${authSocket.userId} disconnected from WebSocket`);
        if (authSocket.userId) {
          this.removeUserConnection(authSocket.userId, socket.id);
          this.updateUserPresence(authSocket.userId, authSocket.userName!, authSocket.userRole!, false);
          this.broadcastUserPresence();
        }
      });

      // Handle notification acknowledgment
      socket.on('notification:read', async (data: { notificationId: string }) => {
        try {
          if (authSocket.userId) {
            await prisma.notification.update({
              where: { id: data.notificationId },
              data: { isRead: true }
            });
            
            socket.emit('notification:read:success', { notificationId: data.notificationId });
          }
        } catch (error) {
          console.error('Error marking notification as read:', error);
          socket.emit('notification:read:error', { error: 'Failed to mark notification as read' });
        }
      });

      // Handle typing indicators
      socket.on('typing:start', (data: { room: string }) => {
        this.updateUserPresence(authSocket.userId!, authSocket.userName!, authSocket.userRole!, true, data.room, true);
        socket.to(data.room).emit('user:typing', { 
          userId: authSocket.userId, 
          userName: authSocket.userName,
          isTyping: true,
          room: data.room
        });
      });

      socket.on('typing:stop', (data: { room: string }) => {
        this.updateUserPresence(authSocket.userId!, authSocket.userName!, authSocket.userRole!, true, data.room, false);
        socket.to(data.room).emit('user:typing', { 
          userId: authSocket.userId, 
          userName: authSocket.userName,
          isTyping: false,
          room: data.room
        });
      });

      // Handle chat messages
      socket.on('chat:message', (data: { message: string, room: string }) => {
        this.handleChatMessage(authSocket, data.message, data.room);
      });

      // Handle live data subscriptions
      socket.on('live:subscribe', (data: { type: string }) => {
        this.subscribeToLiveData(socket.id, data.type);
      });

      socket.on('live:unsubscribe', (data: { type: string }) => {
        this.unsubscribeFromLiveData(socket.id, data.type);
      });

      // Handle page navigation tracking
      socket.on('page:navigate', (data: { page: string }) => {
        if (authSocket.userId) {
          this.updateUserPresence(authSocket.userId, authSocket.userName!, authSocket.userRole!, true, data.page);
        }
      });

      // Handle real-time form updates
      socket.on('form:update', (data: { formId: string, field: string, value: any }) => {
        socket.to(`form:${data.formId}`).emit('form:sync', {
          field: data.field,
          value: data.value,
          userId: authSocket.userId,
          userName: authSocket.userName,
          timestamp: new Date()
        });
      });

      // Handle collaborative editing
      socket.on('edit:start', (data: { documentId: string, field: string }) => {
        socket.join(`edit:${data.documentId}`);
        socket.to(`edit:${data.documentId}`).emit('edit:user:start', {
          userId: authSocket.userId,
          userName: authSocket.userName,
          field: data.field
        });
      });

      socket.on('edit:stop', (data: { documentId: string, field: string }) => {
        socket.to(`edit:${data.documentId}`).emit('edit:user:stop', {
          userId: authSocket.userId,
          userName: authSocket.userName,
          field: data.field
        });
      });

      // Handle system commands
      socket.on('system:ping', () => {
        socket.emit('system:pong', { timestamp: new Date() });
      });
    });
  }

  private addUserConnection(userId: string, socketId: string) {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socketId);
  }

  private removeUserConnection(userId: string, socketId: string) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
        this.userPresence.delete(userId);
      }
    }
  }

  private updateUserPresence(userId: string, userName: string, userRole: string, isOnline: boolean, currentPage?: string, isTyping?: boolean) {
    this.userPresence.set(userId, {
      userId,
      userName,
      userRole,
      isOnline,
      lastSeen: new Date(),
      currentPage,
      isTyping
    });
  }

  private broadcastUserPresence() {
    this.io.emit('presence:update', {
      onlineUsers: this.getOnlineUsers(),
      totalOnline: this.connectedUsers.size
    });
  }

  private getOnlineUsers(): UserPresence[] {
    return Array.from(this.userPresence.values()).filter(user => user.isOnline);
  }

  private handleChatMessage(authSocket: AuthenticatedSocket, message: string, room: string) {
    if (!authSocket.userId || !authSocket.userName) return;

    const chatMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId: authSocket.userId,
      senderName: authSocket.userName,
      message,
      timestamp: new Date(),
      room,
      type: 'text'
    };

    // Store message in room
    if (!this.chatRooms.has(room)) {
      this.chatRooms.set(room, []);
    }
    this.chatRooms.get(room)!.push(chatMessage);

    // Keep only last 100 messages per room
    if (this.chatRooms.get(room)!.length > 100) {
      this.chatRooms.get(room)!.shift();
    }

    // Broadcast to room
    this.io.to(room).emit('chat:message:new', chatMessage);
  }

  private subscribeToLiveData(socketId: string, dataType: string) {
    if (!this.liveDataSubscribers.has(dataType)) {
      this.liveDataSubscribers.set(dataType, new Set());
    }
    this.liveDataSubscribers.get(dataType)!.add(socketId);
  }

  private unsubscribeFromLiveData(socketId: string, dataType: string) {
    const subscribers = this.liveDataSubscribers.get(dataType);
    if (subscribers) {
      subscribers.delete(socketId);
    }
  }

  private startLiveDataBroadcast() {
    // Broadcast live data every 30 seconds
    setInterval(async () => {
      await this.broadcastLiveData();
    }, 30000);

    // Broadcast system health every 60 seconds
    setInterval(() => {
      this.broadcastSystemHealth();
    }, 60000);
  }

  private async broadcastLiveData() {
    try {
      // Get live dashboard data
      const dashboardData = await this.getLiveDashboardData();
      this.broadcastToSubscribers('dashboard', {
        type: 'dashboard',
        data: dashboardData,
        timestamp: new Date()
      });

      // Get live inventory data
      const inventoryData = await this.getLiveInventoryData();
      this.broadcastToSubscribers('inventory', {
        type: 'inventory',
        data: inventoryData,
        timestamp: new Date()
      });

      // Get live restock data
      const restockData = await this.getLiveRestockData();
      this.broadcastToSubscribers('restock', {
        type: 'restock',
        data: restockData,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error broadcasting live data:', error);
    }
  }

  private async getLiveDashboardData() {
    try {
      const [
        totalRevenue,
        totalShops,
        totalProducts,
        pendingRequests
      ] = await Promise.all([
        prisma.billing.aggregate({
        _sum: { total: true },
        where: { paymentStatus: 'Paid' }
        }),
        prisma.shop.count(),
        prisma.product.count(),
        prisma.restockRequest.count({
          where: { status: 'pending' }
        })
      ]);

      return {
        totalRevenue: totalRevenue._sum.total || 0,
        totalShops,
        totalProducts,
        pendingRequests
      };
    } catch (error) {
      console.error('Error getting live dashboard data:', error);
      return null;
    }
  }

  private async getLiveInventoryData() {
    try {
      const lowStockItems = await prisma.shopInventory.findMany({
        where: {
          currentStock: { lte: 10 }, // Assuming 10 is low stock threshold
          isActive: true
        },
        include: {
          product: true,
          shop: true
        },
        take: 10
      });

      return {
        lowStockItems,
        totalLowStock: lowStockItems.length
      };
    } catch (error) {
      console.error('Error getting live inventory data:', error);
      return null;
    }
  }

  private async getLiveRestockData() {
    try {
      const [
        pendingRequests,
        recentRequests
      ] = await Promise.all([
        prisma.restockRequest.count({
          where: { status: 'pending' }
        }),
        prisma.restockRequest.findMany({
          where: {
            status: { in: ['pending', 'in_transit'] }
          },
          include: {
            shop: true,
            product: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ]);

      return {
        pendingRequests,
        recentRequests
      };
    } catch (error) {
      console.error('Error getting live restock data:', error);
      return null;
    }
  }

  private broadcastToSubscribers(dataType: string, data: LiveDataUpdate) {
    const subscribers = this.liveDataSubscribers.get(dataType);
    if (subscribers) {
      subscribers.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('live:data', data);
        }
      });
    }
  }

  private broadcastSystemHealth() {
    const healthData = {
      timestamp: new Date(),
      connectedUsers: this.connectedUsers.size,
      onlineUsers: this.getOnlineUsers().length,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };

    this.io.emit('system:health', healthData);
  }

  // Public methods for sending notifications
  public sendNotificationToUser(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification:new', notification);
  }

  public sendNotificationToRole(role: string, notification: any) {
    this.io.to(`role:${role}`).emit('notification:new', notification);
  }

  public sendNotificationToAll(notification: any) {
    this.io.emit('notification:new', notification);
  }

  public sendSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info') {
    this.io.emit('system:message', { message, type, timestamp: new Date() });
  }

  public sendRestockStatusUpdate(shopId: string, productId: string, status: string, data: any) {
    this.io.to(`shop:${shopId}`).emit('restock:status:update', {
      shopId,
      productId,
      status,
      data,
      timestamp: new Date()
    });
  }

  public sendInventoryUpdate(shopId: string, productId: string, newStock: number) {
    this.io.to(`shop:${shopId}`).emit('inventory:update', {
      shopId,
      productId,
      newStock,
      timestamp: new Date()
    });
  }

  public sendDashboardUpdate(data: any) {
    this.io.emit('dashboard:update', {
      data,
      timestamp: new Date()
    });
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getConnectedUserIds(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public getOnlineUsersList(): UserPresence[] {
    return this.getOnlineUsers();
  }

  public getChatHistory(room: string): ChatMessage[] {
    return this.chatRooms.get(room) || [];
  }

  // Broadcast to specific room
  public broadcastToRoom(room: string, event: string, data: any) {
    this.io.to(room).emit(event, data);
  }

  // Get server instance for advanced usage
  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Singleton instance
let webSocketService: EnhancedWebSocketService | null = null;

export const initializeWebSocket = (server: HTTPServer): EnhancedWebSocketService => {
  if (!webSocketService) {
    webSocketService = new EnhancedWebSocketService(server);
  }
  return webSocketService;
};

export const getWebSocketService = (): EnhancedWebSocketService | null => {
  return webSocketService;
};

export default EnhancedWebSocketService;
