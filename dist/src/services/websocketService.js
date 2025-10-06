"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebSocketService = exports.initializeWebSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const client_2 = require("../config/client");
const prisma = client_2.prisma ?? new client_1.PrismaClient();
class EnhancedWebSocketService {
    constructor(server) {
        this.connectedUsers = new Map(); // userId -> Set of socketIds
        this.userPresence = new Map();
        this.chatRooms = new Map();
        this.liveDataSubscribers = new Map(); // dataType -> Set of socketIds
        this.io = new socket_io_1.Server(server, {
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
    setupMiddleware() {
        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    return next(new Error('Authentication error: No token provided'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                // Get user details from database
                const user = await prisma.user.findUnique({
                    where: { publicId: decoded.publicId },
                    select: { publicId: true, role: true, name: true }
                });
                if (!user) {
                    return next(new Error('Authentication error: User not found'));
                }
                socket.userId = user.publicId;
                socket.userRole = user.role || 'User';
                socket.userName = user.name || 'Unknown User';
                next();
            }
            catch (error) {
                console.error('WebSocket authentication error:', error);
                next(new Error('Authentication error: Invalid token'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            const authSocket = socket;
            console.log(`🔌 User ${authSocket.userId} (${authSocket.userName}) connected via WebSocket`);
            // Join user to their personal room
            if (authSocket.userId) {
                socket.join(`user:${authSocket.userId}`);
                this.addUserConnection(authSocket.userId, socket.id);
                this.updateUserPresence(authSocket.userId, authSocket.userName, authSocket.userRole, true);
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
                    this.updateUserPresence(authSocket.userId, authSocket.userName, authSocket.userRole, false);
                    this.broadcastUserPresence();
                }
            });
            // Handle notification acknowledgment
            socket.on('notification:read', async (data) => {
                try {
                    if (authSocket.userId) {
                        await prisma.notification.update({
                            where: { id: data.notificationId },
                            data: { isRead: true }
                        });
                        socket.emit('notification:read:success', { notificationId: data.notificationId });
                    }
                }
                catch (error) {
                    console.error('Error marking notification as read:', error);
                    socket.emit('notification:read:error', { error: 'Failed to mark notification as read' });
                }
            });
            // Handle typing indicators
            socket.on('typing:start', (data) => {
                this.updateUserPresence(authSocket.userId, authSocket.userName, authSocket.userRole, true, data.room, true);
                socket.to(data.room).emit('user:typing', {
                    userId: authSocket.userId,
                    userName: authSocket.userName,
                    isTyping: true,
                    room: data.room
                });
            });
            socket.on('typing:stop', (data) => {
                this.updateUserPresence(authSocket.userId, authSocket.userName, authSocket.userRole, true, data.room, false);
                socket.to(data.room).emit('user:typing', {
                    userId: authSocket.userId,
                    userName: authSocket.userName,
                    isTyping: false,
                    room: data.room
                });
            });
            // Handle chat messages
            socket.on('chat:message', (data) => {
                this.handleChatMessage(authSocket, data.message, data.room);
            });
            // Handle live data subscriptions
            socket.on('live:subscribe', (data) => {
                this.subscribeToLiveData(socket.id, data.type);
            });
            socket.on('live:unsubscribe', (data) => {
                this.unsubscribeFromLiveData(socket.id, data.type);
            });
            // Handle page navigation tracking
            socket.on('page:navigate', (data) => {
                if (authSocket.userId) {
                    this.updateUserPresence(authSocket.userId, authSocket.userName, authSocket.userRole, true, data.page);
                }
            });
            // Handle real-time form updates
            socket.on('form:update', (data) => {
                socket.to(`form:${data.formId}`).emit('form:sync', {
                    field: data.field,
                    value: data.value,
                    userId: authSocket.userId,
                    userName: authSocket.userName,
                    timestamp: new Date()
                });
            });
            // Handle collaborative editing
            socket.on('edit:start', (data) => {
                socket.join(`edit:${data.documentId}`);
                socket.to(`edit:${data.documentId}`).emit('edit:user:start', {
                    userId: authSocket.userId,
                    userName: authSocket.userName,
                    field: data.field
                });
            });
            socket.on('edit:stop', (data) => {
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
    addUserConnection(userId, socketId) {
        if (!this.connectedUsers.has(userId)) {
            this.connectedUsers.set(userId, new Set());
        }
        this.connectedUsers.get(userId).add(socketId);
    }
    removeUserConnection(userId, socketId) {
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
            userSockets.delete(socketId);
            if (userSockets.size === 0) {
                this.connectedUsers.delete(userId);
                this.userPresence.delete(userId);
            }
        }
    }
    updateUserPresence(userId, userName, userRole, isOnline, currentPage, isTyping) {
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
    broadcastUserPresence() {
        this.io.emit('presence:update', {
            onlineUsers: this.getOnlineUsers(),
            totalOnline: this.connectedUsers.size
        });
    }
    getOnlineUsers() {
        return Array.from(this.userPresence.values()).filter(user => user.isOnline);
    }
    handleChatMessage(authSocket, message, room) {
        if (!authSocket.userId || !authSocket.userName)
            return;
        const chatMessage = {
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
        this.chatRooms.get(room).push(chatMessage);
        // Keep only last 100 messages per room
        if (this.chatRooms.get(room).length > 100) {
            this.chatRooms.get(room).shift();
        }
        // Broadcast to room
        this.io.to(room).emit('chat:message:new', chatMessage);
    }
    subscribeToLiveData(socketId, dataType) {
        if (!this.liveDataSubscribers.has(dataType)) {
            this.liveDataSubscribers.set(dataType, new Set());
        }
        this.liveDataSubscribers.get(dataType).add(socketId);
    }
    unsubscribeFromLiveData(socketId, dataType) {
        const subscribers = this.liveDataSubscribers.get(dataType);
        if (subscribers) {
            subscribers.delete(socketId);
        }
    }
    startLiveDataBroadcast() {
        // Broadcast live data every 30 seconds
        setInterval(async () => {
            await this.broadcastLiveData();
        }, 30000);
        // Broadcast system health every 60 seconds
        setInterval(() => {
            this.broadcastSystemHealth();
        }, 60000);
    }
    async broadcastLiveData() {
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
        }
        catch (error) {
            console.error('Error broadcasting live data:', error);
        }
    }
    async getLiveDashboardData() {
        try {
            const [totalRevenue, totalShops, totalProducts, pendingRequests] = await Promise.all([
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
        }
        catch (error) {
            console.error('Error getting live dashboard data:', error);
            return null;
        }
    }
    async getLiveInventoryData() {
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
        }
        catch (error) {
            console.error('Error getting live inventory data:', error);
            return null;
        }
    }
    async getLiveRestockData() {
        try {
            const [pendingRequests, recentRequests] = await Promise.all([
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
        }
        catch (error) {
            console.error('Error getting live restock data:', error);
            return null;
        }
    }
    broadcastToSubscribers(dataType, data) {
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
    broadcastSystemHealth() {
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
    sendNotificationToUser(userId, notification) {
        this.io.to(`user:${userId}`).emit('notification:new', notification);
    }
    sendNotificationToRole(role, notification) {
        this.io.to(`role:${role}`).emit('notification:new', notification);
    }
    sendNotificationToAll(notification) {
        this.io.emit('notification:new', notification);
    }
    sendSystemMessage(message, type = 'info') {
        this.io.emit('system:message', { message, type, timestamp: new Date() });
    }
    sendRestockStatusUpdate(shopId, productId, status, data) {
        this.io.to(`shop:${shopId}`).emit('restock:status:update', {
            shopId,
            productId,
            status,
            data,
            timestamp: new Date()
        });
    }
    sendInventoryUpdate(shopId, productId, newStock) {
        this.io.to(`shop:${shopId}`).emit('inventory:update', {
            shopId,
            productId,
            newStock,
            timestamp: new Date()
        });
    }
    sendDashboardUpdate(data) {
        this.io.emit('dashboard:update', {
            data,
            timestamp: new Date()
        });
    }
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }
    isUserConnected(userId) {
        return this.connectedUsers.has(userId);
    }
    getConnectedUserIds() {
        return Array.from(this.connectedUsers.keys());
    }
    getOnlineUsersList() {
        return this.getOnlineUsers();
    }
    getChatHistory(room) {
        return this.chatRooms.get(room) || [];
    }
    // Broadcast to specific room
    broadcastToRoom(room, event, data) {
        this.io.to(room).emit(event, data);
    }
    // Get server instance for advanced usage
    getIO() {
        return this.io;
    }
}
// Singleton instance
let webSocketService = null;
const initializeWebSocket = (server) => {
    if (!webSocketService) {
        webSocketService = new EnhancedWebSocketService(server);
    }
    return webSocketService;
};
exports.initializeWebSocket = initializeWebSocket;
const getWebSocketService = () => {
    return webSocketService;
};
exports.getWebSocketService = getWebSocketService;
exports.default = EnhancedWebSocketService;
