import { Request, Response } from 'express';
import { prisma } from '../config/client';
import { logger } from '../utils/logger';
import { enhancedAnalyticsService } from '../services/enhancedAnalyticsService';
import { getDashboardWebSocketService } from '../services/dashboardWebSocketService';

interface DateRange {
  from: Date;
  to: Date;
}

// User interface is already declared in auth middleware

export const getEnhancedDashboard = async (req: Request, res: Response) => {
  try {
    const { from, to, comparisonType = 'previous' } = req.query;
    
    if (!from || !to) {
      res.status(400).json({ 
        error: 'Date range is required. Please provide from and to dates.' 
      });
      return;
    }

    const dateRange: DateRange = {
      from: new Date(from as string),
      to: new Date(to as string)
    };

    // Calculate comparison period
    const comparisonRange = calculateComparisonPeriod(dateRange, comparisonType as string);

    // Generate enhanced analytics
    const analytics = await enhancedAnalyticsService.generateAnalytics(dateRange, comparisonRange);

    // Get user-specific data if not admin
    const user = req.user;
    if (user && user.role !== 'Admin') {
      // Filter data based on user's shop access
      // For now, show all data - shop filtering can be implemented later
      // analytics.productPerformance = analytics.productPerformance.filter(product => 
      //   user.ownedShop?.id === product.shopId
      // );
    }

    // Broadcast real-time update
    const dashboardService = getDashboardWebSocketService();
    if (dashboardService) {
      dashboardService.broadcastDashboardUpdate({
        type: 'enhanced_analytics',
        data: analytics,
        timestamp: new Date()
      });
    }

    logger.info('Enhanced dashboard data generated', {
      userId: user?.publicId,
      dateRange,
      comparisonRange,
      insightsCount: analytics.insights.length
    });

    res.json({
      success: true,
      data: analytics,
      meta: {
        dateRange,
        comparisonRange,
        generatedAt: new Date(),
        userId: user?.publicId
      }
    });

  } catch (error) {
    logger.error('Error generating enhanced dashboard:', error);
    res.status(500).json({ 
      error: 'Failed to generate enhanced dashboard data',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const getLiveMetrics = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const [revenue, orders, lowStockItems, pendingRequests, activeUsers] = await Promise.all([
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
      }),
      prisma.user.count({
        where: {
          updatedAt: { gte: last24Hours }
        }
      })
    ]);

    const metrics = {
      revenue: revenue._sum.total || 0,
      orders,
      lowStockItems,
      pendingRequests,
      activeUsers,
      timestamp: now
    };

    // Broadcast live metrics
    const dashboardService = getDashboardWebSocketService();
    if (dashboardService) {
      dashboardService.broadcastDashboardUpdate({
        type: 'live_metrics',
        data: metrics,
        timestamp: now
      });
    }

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Error getting live metrics:', error);
    res.status(500).json({ 
      error: 'Failed to get live metrics',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const getProductPerformance = async (req: Request, res: Response) => {
  try {
    const { from, to, limit = 10 } = req.query;
    
    if (!from || !to) {
      res.status(400).json({ 
        error: 'Date range is required' 
      });
      return;
    }

    const dateRange: DateRange = {
      from: new Date(from as string),
      to: new Date(to as string)
    };

    const products = await prisma.product.findMany({
      include: {
        shopInventory: {
          where: {
            createdAt: { gte: dateRange.from, lte: dateRange.to }
          }
        },
        category: true,
        flavor: true
      },
      take: parseInt(limit as string)
    });

    const productPerformance = products.map(product => {
      const currentStock = product.shopInventory.reduce((sum, inv) => sum + (inv.currentStock || 0), 0);

      return {
        id: product.id,
        name: product.name,
        category: product.category?.name || 'Unknown',
        flavor: product.flavor?.name || 'Unknown',
        currentStock,
        totalSold: 0, // This would need to be calculated from billing data
        revenue: 0, // This would need to be calculated from billing data
        efficiency: 0
      };
    }).sort((a, b) => b.revenue - a.revenue);

    res.json({
      success: true,
      data: productPerformance
    });

  } catch (error) {
    logger.error('Error getting product performance:', error);
    res.status(500).json({ 
      error: 'Failed to get product performance data',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const getCustomerAnalytics = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      res.status(400).json({ 
        error: 'Date range is required' 
      });
      return;
    }

    const dateRange: DateRange = {
      from: new Date(from as string),
      to: new Date(to as string)
    };

    // Get billing data grouped by customer email
    const customers = await prisma.billing.groupBy({
      by: ['customerEmail'],
      where: {
        createdAt: { gte: dateRange.from, lte: dateRange.to },
        paymentStatus: 'Paid',
        customerEmail: { not: null }
      },
      _sum: { total: true },
      _count: { id: true }
    });

    const customerDetails = customers.map((customer) => {
      return {
        id: customer.customerEmail || 'unknown',
        name: customer.customerEmail || 'Unknown',
        totalSpent: customer._sum.total || 0,
        orderCount: customer._count.id,
        firstOrderDate: new Date(),
        lastOrderDate: new Date(),
        averageOrderValue: customer._count.id > 0 ? (customer._sum.total || 0) / customer._count.id : 0
      };
    });

    const totalRevenue = customerDetails.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalOrders = customerDetails.reduce((sum, c) => sum + c.orderCount, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const analytics = {
      totalCustomers: customerDetails.length,
      totalRevenue,
      totalOrders,
      averageOrderValue,
      topCustomers: customerDetails
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10),
      customerSegments: calculateCustomerSegments(customerDetails)
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Error getting customer analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get customer analytics data',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const getOperationalMetrics = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      res.status(400).json({ 
        error: 'Date range is required' 
      });
      return;
    }

    const dateRange: DateRange = {
      from: new Date(from as string),
      to: new Date(to as string)
    };

    const [
      totalShops,
      activeShops,
      lowStockItems,
      pendingRestockRequests,
      restockRequests,
      inventoryTurnover
    ] = await Promise.all([
      prisma.shop.count(),
      prisma.shop.count({ where: { isActive: true } }),
      prisma.shopInventory.count({
        where: { currentStock: { lte: 10 }, isActive: true }
      }),
      prisma.restockRequest.count({ where: { status: 'pending' } }),
      prisma.restockRequest.findMany({
        where: {
          createdAt: { gte: dateRange.from, lte: dateRange.to },
          status: { in: ['approved', 'fulfilled'] }
        },
        select: { createdAt: true, updatedAt: true }
      }),
      calculateInventoryTurnover(dateRange)
    ]);

    const averageRestockTime = calculateAverageRestockTime(restockRequests);
    const systemHealth = determineSystemHealth({
      lowStockItems,
      pendingRestockRequests,
      averageRestockTime
    });

    const metrics = {
      totalShops,
      activeShops,
      lowStockItems,
      pendingRestockRequests,
      averageRestockTime,
      inventoryTurnover,
      systemHealth,
      timestamp: new Date()
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Error getting operational metrics:', error);
    res.status(500).json({ 
      error: 'Failed to get operational metrics data',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const generateInsights = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      res.status(400).json({ 
        error: 'Date range is required' 
      });
      return;
    }

    const dateRange: DateRange = {
      from: new Date(from as string),
      to: new Date(to as string)
    };

    const comparisonRange = calculateComparisonPeriod(dateRange, 'previous');
    const analytics = await enhancedAnalyticsService.generateAnalytics(dateRange, comparisonRange);

    // Send insights via WebSocket
    const dashboardService = getDashboardWebSocketService();
    if (dashboardService) {
      analytics.insights.forEach(insight => {
        const liveInsight = {
          id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: insight.type,
          category: insight.category,
          title: insight.title,
          description: insight.description,
          impact: insight.impact,
          actionable: insight.actionable,
          actionText: insight.actionText,
          actionUrl: insight.actionUrl,
          timestamp: new Date(),
          data: insight.data
        };
        dashboardService.sendInsightToUser(req.user?.publicId || '', liveInsight);
      });
    }

    res.json({
      success: true,
      data: {
        insights: analytics.insights,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Error generating insights:', error);
    res.status(500).json({ 
      error: 'Failed to generate insights',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// Helper functions
function calculateComparisonPeriod(dateRange: DateRange, comparisonType: string): DateRange {
  const { from, to } = dateRange;
  const duration = to.getTime() - from.getTime();
  
  let comparisonFrom: Date;
  let comparisonTo: Date;

  switch (comparisonType) {
    case 'year_ago':
      comparisonFrom = new Date(from);
      comparisonTo = new Date(to);
      comparisonFrom.setFullYear(comparisonFrom.getFullYear() - 1);
      comparisonTo.setFullYear(comparisonTo.getFullYear() - 1);
      break;
    default: // 'previous'
      comparisonFrom = new Date(from.getTime() - duration);
      comparisonTo = new Date(from);
      break;
  }

  return {
    from: comparisonFrom,
    to: comparisonTo
  };
}

function calculateCustomerSegments(customers: any[]) {
  const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const averageSpent = totalSpent / customers.length;

  const highValue = customers.filter(c => c.totalSpent > averageSpent * 2).length;
  const mediumValue = customers.filter(c => 
    c.totalSpent > averageSpent * 0.5 && c.totalSpent <= averageSpent * 2
  ).length;
  const lowValue = customers.filter(c => c.totalSpent <= averageSpent * 0.5).length;

  return { highValue, mediumValue, lowValue };
}

async function calculateInventoryTurnover(dateRange: DateRange): Promise<number> {
  const totalSold = await prisma.shopInventory.aggregate({
    _sum: { currentStock: true },
    where: {
      createdAt: { gte: dateRange.from, lte: dateRange.to }
    }
  });

  const averageInventory = await prisma.shopInventory.aggregate({
    _avg: { currentStock: true },
    where: {
      createdAt: { gte: dateRange.from, lte: dateRange.to }
    }
  });

  const sold = totalSold._sum.currentStock || 0;
  const avgInventory = averageInventory._avg.currentStock || 1;

  return sold / avgInventory;
}

function calculateAverageRestockTime(restockRequests: any[]): number {
  if (restockRequests.length === 0) return 0;

  const totalTime = restockRequests.reduce((sum, req) => {
    const timeDiff = req.updatedAt.getTime() - req.createdAt.getTime();
    return sum + timeDiff;
  }, 0);

  return totalTime / restockRequests.length / (1000 * 60 * 60); // Convert to hours
}

function determineSystemHealth(metrics: any): 'excellent' | 'good' | 'warning' | 'critical' {
  if (metrics.lowStockItems > 20 || metrics.pendingRestockRequests > 10) {
    return 'critical';
  }
  if (metrics.lowStockItems > 10 || metrics.pendingRestockRequests > 5 || metrics.averageRestockTime > 48) {
    return 'warning';
  }
  if (metrics.lowStockItems > 5 || metrics.pendingRestockRequests > 2 || metrics.averageRestockTime > 24) {
    return 'good';
  }
  return 'excellent';
}
