"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardWebSocketService = exports.initializeDashboardWebSocket = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("../config/client");
const logger_1 = require("../utils/logger");
const socketService_1 = require("./socketService");
const aiInsightsService_1 = require("./aiInsightsService");
class DashboardWebSocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map();
        this.socketMap = new Map();
        this.userPreferences = new Map();
        this.liveDataSubscribers = new Map();
        this.insightSubscribers = new Map();
        this.dateRangeSubscribers = new Map();
    }
    initialize(server) {
        // Get the existing Socket.IO server from the main socket service
        const mainSocketService = (0, socketService_1.getSocketService)();
        const mainIO = mainSocketService.getIO();
        if (!mainIO) {
            throw new Error('Main Socket.IO server not initialized. Please initialize the main socket service first.');
        }
        // Create dashboard namespace on the existing server
        this.io = mainIO.of('/dashboard');
        this.io.use(this.authenticateSocket.bind(this));
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
        // Start live data broadcasting
        this.startLiveDataBroadcast();
        this.startInsightGeneration();
        logger_1.logger.info('Dashboard WebSocket service initialized');
    }
    async authenticateSocket(socket, next) {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            const user = await client_1.prisma.user.findUnique({
                where: { publicId: decoded.publicId },
                select: { id: true, publicId: true, role: true, name: true, email: true }
            });
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }
            socket.userId = user.id.toString();
            socket.userPublicId = user.publicId;
            socket.userRole = user.role || 'User';
            socket.userName = user.name || user.email || 'Unknown User';
            next();
        }
        catch (error) {
            logger_1.logger.error('Dashboard WebSocket authentication error:', error);
            next(new Error('Authentication error: Invalid token'));
        }
    }
    handleConnection(socket) {
        const userId = socket.userId;
        const userPublicId = socket.userPublicId;
        const userRole = socket.userRole;
        this.connectedUsers.set(userId, socket.id);
        this.socketMap.set(socket.id, socket);
        // Join user to their personal room
        socket.join(`user:${userPublicId}`);
        socket.join(`role:${userRole}`);
        logger_1.logger.info(`Dashboard WebSocket: User ${userPublicId} (${userRole}) connected`);
        // Send connection confirmation
        socket.emit('dashboard:connected', {
            userId: userPublicId,
            role: userRole,
            timestamp: new Date().toISOString(),
            features: {
                realTimeMetrics: true,
                liveInsights: true,
                dateRangeComparison: true,
                liveNotifications: true
            }
        });
        // Handle date range changes
        socket.on('dashboard:dateRange:change', async (data) => {
            try {
                const comparisonPeriod = await this.calculateComparisonPeriod(data.dateRange, data.comparisonType);
                const metrics = await this.calculateLiveMetrics(data.dateRange, comparisonPeriod);
                socket.emit('dashboard:dateRange:updated', {
                    dateRange: data.dateRange,
                    comparisonPeriod,
                    metrics,
                    timestamp: new Date().toISOString()
                });
                // Broadcast to other subscribers
                this.broadcastToDateRangeSubscribers('dashboard:dateRange:updated', {
                    userId: userPublicId,
                    dateRange: data.dateRange,
                    comparisonPeriod,
                    metrics,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Error handling date range change:', error);
                socket.emit('dashboard:error', { message: 'Failed to update date range' });
            }
        });
        // Handle live data subscriptions
        socket.on('dashboard:subscribe:live', (data) => {
            this.subscribeToLiveData(socket.id, data.type);
            socket.emit('dashboard:subscribed', { type: data.type });
        });
        socket.on('dashboard:unsubscribe:live', (data) => {
            this.unsubscribeFromLiveData(socket.id, data.type);
            socket.emit('dashboard:unsubscribed', { type: data.type });
        });
        // Handle insight subscriptions
        socket.on('dashboard:subscribe:insights', () => {
            this.subscribeToInsights(socket.id);
            socket.emit('dashboard:insights:subscribed');
        });
        socket.on('dashboard:unsubscribe:insights', () => {
            this.unsubscribeFromInsights(socket.id);
            socket.emit('dashboard:insights:unsubscribed');
        });
        // Handle user preferences
        socket.on('dashboard:preferences:save', (data) => {
            this.userPreferences.set(userPublicId, data.preferences);
            socket.emit('dashboard:preferences:saved', { preferences: data.preferences });
        });
        socket.on('dashboard:preferences:load', () => {
            const preferences = this.userPreferences.get(userPublicId) || {};
            socket.emit('dashboard:preferences:loaded', { preferences });
        });
        // Handle reset to default
        socket.on('dashboard:reset:default', () => {
            const defaultDateRange = this.getDefaultDateRange();
            this.userPreferences.delete(userPublicId);
            socket.emit('dashboard:reset:complete', {
                dateRange: defaultDateRange,
                preferences: {},
                timestamp: new Date().toISOString()
            });
        });
        // Handle disconnection
        socket.on('disconnect', () => {
            this.connectedUsers.delete(userId);
            this.socketMap.delete(socket.id);
            this.unsubscribeFromAllLiveData(socket.id);
            this.unsubscribeFromInsights(socket.id);
            logger_1.logger.info(`Dashboard WebSocket: User ${userPublicId} disconnected`);
        });
    }
    async calculateComparisonPeriod(dateRange, comparisonType) {
        const { from, to } = dateRange;
        const duration = to.getTime() - from.getTime();
        let comparisonFrom;
        let comparisonTo;
        let label;
        let type;
        switch (comparisonType || 'previous') {
            case 'year_ago':
                comparisonFrom = new Date(from);
                comparisonTo = new Date(to);
                comparisonFrom.setFullYear(comparisonFrom.getFullYear() - 1);
                comparisonTo.setFullYear(comparisonTo.getFullYear() - 1);
                label = 'Same period last year';
                type = 'year_ago';
                break;
            case 'custom':
                // For custom, we'll use the previous period of same duration
                comparisonFrom = new Date(from.getTime() - duration);
                comparisonTo = new Date(from);
                label = 'Previous period';
                type = 'custom';
                break;
            default: // 'previous'
                comparisonFrom = new Date(from.getTime() - duration);
                comparisonTo = new Date(from);
                label = 'Previous period';
                type = 'previous';
                break;
        }
        return {
            from: comparisonFrom,
            to: comparisonTo,
            label,
            type
        };
    }
    async calculateLiveMetrics(dateRange, comparisonPeriod) {
        try {
            // Calculate current period metrics
            const currentMetrics = await this.getMetricsForPeriod(dateRange);
            // Calculate comparison period metrics
            const previousMetrics = await this.getMetricsForPeriod(comparisonPeriod);
            // Calculate growth and trends
            const revenue = this.calculateGrowthMetrics(currentMetrics.revenue, previousMetrics.revenue);
            const orders = this.calculateGrowthMetrics(currentMetrics.orders, previousMetrics.orders);
            const products = this.calculateGrowthMetrics(currentMetrics.products, previousMetrics.products);
            const customers = this.calculateGrowthMetrics(currentMetrics.customers, previousMetrics.customers);
            return {
                revenue,
                orders,
                products,
                customers
            };
        }
        catch (error) {
            logger_1.logger.error('Error calculating live metrics:', error);
            throw error;
        }
    }
    async getMetricsForPeriod(period) {
        const [revenue, orders, products, customers] = await Promise.all([
            // Revenue calculation
            client_1.prisma.billing.aggregate({
                _sum: { total: true },
                where: {
                    paymentStatus: 'Paid',
                    createdAt: {
                        gte: period.from,
                        lte: period.to
                    }
                }
            }),
            // Orders calculation
            client_1.prisma.billing.count({
                where: {
                    createdAt: {
                        gte: period.from,
                        lte: period.to
                    }
                }
            }),
            // Products calculation
            client_1.prisma.product.count({
                where: {
                    createdAt: {
                        gte: period.from,
                        lte: period.to
                    }
                }
            }),
            // Customers calculation (unique users who made purchases)
            client_1.prisma.billing.findMany({
                where: {
                    createdAt: {
                        gte: period.from,
                        lte: period.to
                    }
                },
                select: { customerEmail: true },
                distinct: ['customerEmail']
            })
        ]);
        return {
            revenue: revenue._sum.total || 0,
            orders: orders,
            products: products,
            customers: customers.length
        };
    }
    calculateGrowthMetrics(current, previous) {
        const growth = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
        const trend = growth > 5 ? 'up' : growth < -5 ? 'down' : 'stable';
        return {
            current,
            previous,
            growth: Math.round(growth * 100) / 100,
            trend
        };
    }
    getDefaultDateRange() {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return { from: start, to: end };
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
    unsubscribeFromAllLiveData(socketId) {
        for (const [dataType, subscribers] of this.liveDataSubscribers.entries()) {
            subscribers.delete(socketId);
        }
    }
    subscribeToInsights(socketId) {
        if (!this.insightSubscribers.has('all')) {
            this.insightSubscribers.set('all', new Set());
        }
        this.insightSubscribers.get('all').add(socketId);
    }
    unsubscribeFromInsights(socketId) {
        const subscribers = this.insightSubscribers.get('all');
        if (subscribers) {
            subscribers.delete(socketId);
        }
    }
    subscribeToDateRange(socketId) {
        if (!this.dateRangeSubscribers.has('all')) {
            this.dateRangeSubscribers.set('all', new Set());
        }
        this.dateRangeSubscribers.get('all').add(socketId);
    }
    unsubscribeFromDateRange(socketId) {
        const subscribers = this.dateRangeSubscribers.get('all');
        if (subscribers) {
            subscribers.delete(socketId);
        }
    }
    broadcastToLiveDataSubscribers(dataType, data) {
        const subscribers = this.liveDataSubscribers.get(dataType);
        if (subscribers && this.io) {
            subscribers.forEach(socketId => {
                const socket = this.socketMap.get(socketId);
                if (socket) {
                    socket.emit('dashboard:live:data', { type: dataType, data, timestamp: new Date() });
                }
            });
        }
    }
    broadcastToInsightSubscribers(insight) {
        const subscribers = this.insightSubscribers.get('all');
        if (subscribers && this.io) {
            subscribers.forEach(socketId => {
                const socket = this.socketMap.get(socketId);
                if (socket) {
                    socket.emit('dashboard:insight:new', insight);
                }
            });
        }
    }
    broadcastToDateRangeSubscribers(event, data) {
        const subscribers = this.dateRangeSubscribers.get('all');
        if (subscribers && this.io) {
            subscribers.forEach(socketId => {
                const socket = this.socketMap.get(socketId);
                if (socket) {
                    socket.emit(event, data);
                }
            });
        }
    }
    startLiveDataBroadcast() {
        // Broadcast live metrics every 30 seconds
        setInterval(async () => {
            try {
                const metrics = await this.getLiveMetrics();
                this.broadcastToLiveDataSubscribers('metrics', metrics);
            }
            catch (error) {
                logger_1.logger.error('Error broadcasting live metrics:', error);
            }
        }, 30000);
        // Broadcast system health every 60 seconds
        setInterval(() => {
            const healthData = {
                connectedUsers: this.connectedUsers.size,
                timestamp: new Date(),
                status: 'healthy'
            };
            this.broadcastToLiveDataSubscribers('health', healthData);
        }, 60000);
    }
    startInsightGeneration() {
        // Generate insights every 2 minutes
        setInterval(async () => {
            try {
                const insights = await this.generateLiveInsights();
                insights.forEach(insight => {
                    this.broadcastToInsightSubscribers(insight);
                });
            }
            catch (error) {
                logger_1.logger.error('Error generating insights:', error);
            }
        }, 120000);
    }
    async getLiveMetrics() {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const [revenue, orders, lowStockItems, pendingRequests] = await Promise.all([
            client_1.prisma.billing.aggregate({
                _sum: { total: true },
                where: {
                    paymentStatus: 'Paid',
                    createdAt: { gte: last24Hours }
                }
            }),
            client_1.prisma.billing.count({
                where: { createdAt: { gte: last24Hours } }
            }),
            client_1.prisma.shopInventory.count({
                where: {
                    currentStock: { lte: 10 },
                    isActive: true
                }
            }),
            client_1.prisma.restockRequest.count({
                where: { status: 'pending' }
            })
        ]);
        return {
            revenue: revenue._sum.total || 0,
            orders,
            lowStockItems,
            pendingRequests,
            timestamp: now
        };
    }
    async generateLiveInsights() {
        const insights = [];
        const now = new Date();
        try {
            // Get current analytics data for AI insights
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 7);
            const dateRange = { from: start, to: end };
            const comparisonRange = {
                from: new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000),
                to: start
            };
            // Get basic metrics
            const [revenue, orders, lowStockItems, pendingRequests] = await Promise.all([
                this.getMetricsForPeriod(dateRange),
                this.getMetricsForPeriod(comparisonRange),
                client_1.prisma.shopInventory.count({
                    where: { currentStock: { lte: 10 }, isActive: true }
                }),
                client_1.prisma.restockRequest.count({ where: { status: 'pending' } })
            ]);
            const analyticsData = {
                revenue: {
                    current: revenue.revenue,
                    previous: orders.revenue,
                    growth: orders.revenue > 0 ? ((revenue.revenue - orders.revenue) / orders.revenue) * 100 : 0
                },
                orders: {
                    current: revenue.orders,
                    previous: orders.orders,
                    growth: orders.orders > 0 ? ((revenue.orders - orders.orders) / orders.orders) * 100 : 0
                },
                products: {
                    current: revenue.products,
                    previous: orders.products,
                    growth: orders.products > 0 ? ((revenue.products - orders.products) / orders.products) * 100 : 0
                },
                customers: {
                    current: revenue.customers,
                    previous: orders.customers,
                    growth: orders.customers > 0 ? ((revenue.customers - orders.customers) / orders.customers) * 100 : 0
                },
                lowStockItems,
                pendingRequests: pendingRequests,
                topProducts: [],
                customerSegments: { highValue: 0, mediumValue: 0, lowValue: 0 }
            };
            // Generate AI insights
            const aiInsights = await aiInsightsService_1.aiInsightsService.generateInsights(analyticsData, dateRange);
            // Convert AI insights to LiveInsight format
            aiInsights.forEach(aiInsight => {
                insights.push({
                    id: `ai_insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: aiInsight.type,
                    category: aiInsight.category,
                    title: aiInsight.title,
                    description: aiInsight.description,
                    impact: aiInsight.impact,
                    actionable: aiInsight.actionable,
                    actionText: aiInsight.actionText,
                    actionUrl: aiInsight.actionUrl,
                    timestamp: now,
                    data: aiInsight.data
                });
            });
        }
        catch (error) {
            logger_1.logger.error('Error generating AI insights:', error);
            // Fallback to basic insights
            const lowStockCount = await client_1.prisma.shopInventory.count({
                where: { currentStock: { lte: 10 }, isActive: true }
            });
            if (lowStockCount > 0) {
                insights.push({
                    id: `insight_${Date.now()}_low_stock`,
                    type: 'warning',
                    category: 'operational',
                    title: 'Low Stock Alert',
                    description: `${lowStockCount} products are running low on stock. Consider restocking soon.`,
                    impact: 'high',
                    actionable: true,
                    actionText: 'View Low Stock Items',
                    actionUrl: '/low-stock',
                    timestamp: now,
                    data: { lowStockCount }
                });
            }
        }
        return insights;
    }
    // Public methods for external use
    broadcastDashboardUpdate(data) {
        if (this.io) {
            this.io.emit('dashboard:update', {
                data,
                timestamp: new Date().toISOString()
            });
        }
    }
    sendInsightToUser(userId, insight) {
        if (this.io) {
            this.io.to(`user:${userId}`).emit('dashboard:insight:new', insight);
        }
    }
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }
    isUserConnected(userId) {
        return this.connectedUsers.has(userId);
    }
}
// Singleton instance
let dashboardWebSocketService = null;
const initializeDashboardWebSocket = (server) => {
    if (!dashboardWebSocketService) {
        dashboardWebSocketService = new DashboardWebSocketService();
        dashboardWebSocketService.initialize(server);
    }
    return dashboardWebSocketService;
};
exports.initializeDashboardWebSocket = initializeDashboardWebSocket;
const getDashboardWebSocketService = () => {
    return dashboardWebSocketService;
};
exports.getDashboardWebSocketService = getDashboardWebSocketService;
exports.default = DashboardWebSocketService;
