import { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/client';
import { logger } from '../utils/logger';
import { getSocketService } from './socketService';
import { aiInsightsService } from './aiInsightsService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userPublicId?: string;
  userName?: string;
}

interface DateRange {
  from: Date;
  to: Date;
}

interface ComparisonPeriod {
  from: Date;
  to: Date;
  label: string;
  type: 'previous' | 'year_ago' | 'custom';
}

interface DashboardMetrics {
  revenue: {
    current: number;
    previous: number;
    growth: number;
    trend: 'up' | 'down' | 'stable';
  };
  orders: {
    current: number;
    previous: number;
    growth: number;
    trend: 'up' | 'down' | 'stable';
  };
  products: {
    current: number;
    previous: number;
    growth: number;
    trend: 'up' | 'down' | 'stable';
  };
  customers: {
    current: number;
    previous: number;
    growth: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface LiveInsight {
  id: string;
  type: 'growth' | 'decline' | 'opportunity' | 'warning';
  category: 'financial' | 'product' | 'customer' | 'operational' | 'strategic';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  actionText?: string;
  actionUrl?: string;
  timestamp: Date;
  data: any;
}

class DashboardWebSocketService {
  private io: Namespace | null = null;
  private connectedUsers: Map<string, string> = new Map();
  private socketMap: Map<string, Socket> = new Map();
  private userPreferences: Map<string, any> = new Map();
  private liveDataSubscribers: Map<string, Set<string>> = new Map();
  private insightSubscribers: Map<string, Set<string>> = new Map();
  private dateRangeSubscribers: Map<string, Set<string>> = new Map();

  initialize(server: HTTPServer): void {
    // Get the existing Socket.IO server from the main socket service
    const mainSocketService = getSocketService();
    const mainIO = mainSocketService.getIO();
    
    if (!mainIO) {
      throw new Error('Main Socket.IO server not initialized. Please initialize the main socket service first.');
    }
    
    // Create dashboard namespace on the existing server
    this.io = mainIO.of('/dashboard');

    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    // Start live data broadcasting
    this.startLiveDataBroadcast();
    this.startInsightGeneration();

    logger.info('Dashboard WebSocket service initialized');
  }

  private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      
      const user = await prisma.user.findUnique({
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
    } catch (error) {
      logger.error('Dashboard WebSocket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket) {
    const userId = socket.userId!;
    const userPublicId = socket.userPublicId!;
    const userRole = socket.userRole!;

    this.connectedUsers.set(userId, socket.id);
    this.socketMap.set(socket.id, socket);

    // Join user to their personal room
    socket.join(`user:${userPublicId}`);
    socket.join(`role:${userRole}`);

    logger.info(`Dashboard WebSocket: User ${userPublicId} (${userRole}) connected`);

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
    socket.on('dashboard:dateRange:change', async (data: { dateRange: DateRange, comparisonType?: string }) => {
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
      } catch (error) {
        logger.error('Error handling date range change:', error);
        socket.emit('dashboard:error', { message: 'Failed to update date range' });
      }
    });

    // Handle live data subscriptions
    socket.on('dashboard:subscribe:live', (data: { type: string }) => {
      this.subscribeToLiveData(socket.id, data.type);
      socket.emit('dashboard:subscribed', { type: data.type });
    });

    socket.on('dashboard:unsubscribe:live', (data: { type: string }) => {
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
    socket.on('dashboard:preferences:save', (data: { preferences: any }) => {
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
      logger.info(`Dashboard WebSocket: User ${userPublicId} disconnected`);
    });
  }

  private async calculateComparisonPeriod(dateRange: DateRange, comparisonType?: string): Promise<ComparisonPeriod> {
    const { from, to } = dateRange;
    const duration = to.getTime() - from.getTime();
    
    let comparisonFrom: Date;
    let comparisonTo: Date;
    let label: string;
    let type: 'previous' | 'year_ago' | 'custom';

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

  private async calculateLiveMetrics(dateRange: DateRange, comparisonPeriod: ComparisonPeriod): Promise<DashboardMetrics> {
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
    } catch (error) {
      logger.error('Error calculating live metrics:', error);
      throw error;
    }
  }

  private async getMetricsForPeriod(period: DateRange | ComparisonPeriod): Promise<{
    revenue: number;
    orders: number;
    products: number;
    customers: number;
  }> {
    const [revenue, orders, products, customers] = await Promise.all([
      // Revenue calculation
      prisma.billing.aggregate({
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
      prisma.billing.count({
        where: {
          createdAt: {
            gte: period.from,
            lte: period.to
          }
        }
      }),
      
      // Products calculation
      prisma.product.count({
        where: {
          createdAt: {
            gte: period.from,
            lte: period.to
          }
        }
      }),
      
      // Customers calculation (unique users who made purchases)
      prisma.billing.findMany({
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

  private calculateGrowthMetrics(current: number, previous: number): {
    current: number;
    previous: number;
    growth: number;
    trend: 'up' | 'down' | 'stable';
  } {
    const growth = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
    const trend = growth > 5 ? 'up' : growth < -5 ? 'down' : 'stable';
    
    return {
      current,
      previous,
      growth: Math.round(growth * 100) / 100,
      trend
    };
  }

  private getDefaultDateRange(): DateRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { from: start, to: end };
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

  private unsubscribeFromAllLiveData(socketId: string) {
    for (const [dataType, subscribers] of this.liveDataSubscribers.entries()) {
      subscribers.delete(socketId);
    }
  }

  private subscribeToInsights(socketId: string) {
    if (!this.insightSubscribers.has('all')) {
      this.insightSubscribers.set('all', new Set());
    }
    this.insightSubscribers.get('all')!.add(socketId);
  }

  private unsubscribeFromInsights(socketId: string) {
    const subscribers = this.insightSubscribers.get('all');
    if (subscribers) {
      subscribers.delete(socketId);
    }
  }

  private subscribeToDateRange(socketId: string) {
    if (!this.dateRangeSubscribers.has('all')) {
      this.dateRangeSubscribers.set('all', new Set());
    }
    this.dateRangeSubscribers.get('all')!.add(socketId);
  }

  private unsubscribeFromDateRange(socketId: string) {
    const subscribers = this.dateRangeSubscribers.get('all');
    if (subscribers) {
      subscribers.delete(socketId);
    }
  }

  private broadcastToLiveDataSubscribers(dataType: string, data: any) {
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

  private broadcastToInsightSubscribers(insight: LiveInsight) {
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

  private broadcastToDateRangeSubscribers(event: string, data: any) {
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

  private startLiveDataBroadcast() {
    // Broadcast live metrics every 30 seconds
    setInterval(async () => {
      try {
        const metrics = await this.getLiveMetrics();
        this.broadcastToLiveDataSubscribers('metrics', metrics);
      } catch (error) {
        logger.error('Error broadcasting live metrics:', error);
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

  private startInsightGeneration() {
    // Generate insights every 2 minutes
    setInterval(async () => {
      try {
        const insights = await this.generateLiveInsights();
        insights.forEach(insight => {
          this.broadcastToInsightSubscribers(insight);
        });
      } catch (error) {
        logger.error('Error generating insights:', error);
      }
    }, 120000);
  }

  private async getLiveMetrics(): Promise<any> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const [revenue, orders, lowStockItems, pendingRequests] = await Promise.all([
      prisma.billing.aggregate({
        _sum: { total: true },
        where: {
          paymentStatus: 'Paid',
          createdAt: { gte: last24Hours }
        }
      }),
      prisma.billing.count({
        where: { createdAt: { gte: last24Hours } }
      }),
      prisma.shopInventory.count({
        where: {
          currentStock: { lte: 10 },
          isActive: true
        }
      }),
      prisma.restockRequest.count({
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

  private async generateLiveInsights(): Promise<LiveInsight[]> {
    const insights: LiveInsight[] = [];
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
        prisma.shopInventory.count({
          where: { currentStock: { lte: 10 }, isActive: true }
        }),
        prisma.restockRequest.count({ where: { status: 'pending' } })
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
      const aiInsights = await aiInsightsService.generateInsights(analyticsData, dateRange);
      
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

    } catch (error) {
      logger.error('Error generating AI insights:', error);
      
      // Fallback to basic insights
      const lowStockCount = await prisma.shopInventory.count({
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
  public broadcastDashboardUpdate(data: any) {
    if (this.io) {
      this.io.emit('dashboard:update', {
        data,
        timestamp: new Date().toISOString()
      });
    }
  }

  public sendInsightToUser(userId: string, insight: LiveInsight) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit('dashboard:insight:new', insight);
    }
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}

// Singleton instance
let dashboardWebSocketService: DashboardWebSocketService | null = null;

export const initializeDashboardWebSocket = (server: HTTPServer): DashboardWebSocketService => {
  if (!dashboardWebSocketService) {
    dashboardWebSocketService = new DashboardWebSocketService();
    dashboardWebSocketService.initialize(server);
  }
  return dashboardWebSocketService;
};

export const getDashboardWebSocketService = (): DashboardWebSocketService | null => {
  return dashboardWebSocketService;
};

export default DashboardWebSocketService;
