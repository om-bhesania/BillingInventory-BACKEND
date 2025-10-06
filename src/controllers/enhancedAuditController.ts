import { Request, Response } from 'express';
import { auditService } from '../services/auditService';
import { logger } from '../utils/logger';
import { prisma } from '../config/client';

export class EnhancedAuditController {
  // Get all audit events with filtering
  static async getAuditEvents(req: Request, res: Response): Promise<void> {
    try {
      const {
        type,
        action,
        entity,
        userId,
        shopId,
        severity,
        status,
        startDate,
        endDate,
        limit = 100,
        offset = 0
      } = req.query;

      const filters = {
        type: type as string,
        action: action as string,
        entity: entity as string,
        userId: userId as string,
        shopId: shopId as string,
        severity: severity as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const result = await auditService.getAuditEvents(filters);

      res.json({
        success: true,
        data: result.events,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          pages: Math.ceil(result.total / filters.limit)
        }
      });
    } catch (error) {
      logger.error('Error getting audit events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audit events'
      });
    }
  }

  // Get security events specifically
  static async getSecurityEvents(req: Request, res: Response): Promise<void> {
    try {
      const {
        threatLevel,
        attackType,
        blocked,
        startDate,
        endDate,
        limit = 100,
        offset = 0
      } = req.query;

      const filters = {
        threatLevel: threatLevel as string,
        attackType: attackType as string,
        blocked: blocked ? blocked === 'true' : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const result = await auditService.getSecurityEvents(filters);

      res.json({
        success: true,
        data: result.events,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          pages: Math.ceil(result.total / filters.limit)
        }
      });
    } catch (error) {
      logger.error('Error getting security events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get security events'
      });
    }
  }

  // Get audit statistics
  static async getAuditStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'day' } = req.query;
      
      const stats = await auditService.getAuditStatistics(period as 'hour' | 'day' | 'week' | 'month');

      if (!stats) {
        res.status(500).json({
          success: false,
          error: 'Failed to get audit statistics'
        });
        return;
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting audit statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audit statistics'
      });
    }
  }

  // Get security dashboard data
  static async getSecurityDashboard(req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        recentSecurityEvents,
        criticalEvents,
        attackTypes,
        topSourceIPs,
        blockedAttempts,
        securityStats
      ] = await Promise.all([
        auditService.getSecurityEvents({
          startDate: last24Hours,
          limit: 50
        }),
        auditService.getSecurityEvents({
          threatLevel: 'critical',
          startDate: last7Days,
          limit: 20
        }),
        prisma.auditLog.groupBy({
          by: ['attackType'],
          where: {
            type: 'security',
            attackType: { not: null },
            timestamp: { gte: last7Days }
          },
          _count: { attackType: true },
          orderBy: { _count: { attackType: 'desc' } },
          take: 10
        }),
        prisma.auditLog.groupBy({
          by: ['sourceIp'],
          where: {
            type: 'security',
            sourceIp: { not: null },
            timestamp: { gte: last7Days }
          },
          _count: { sourceIp: true },
          orderBy: { _count: { sourceIp: 'desc' } },
          take: 10
        }),
        prisma.auditLog.count({
          where: {
            type: 'security',
            blocked: true,
            timestamp: { gte: last24Hours }
          }
        }),
        auditService.getAuditStatistics('day')
      ]);

      res.json({
        success: true,
        data: {
          recentSecurityEvents: recentSecurityEvents.events,
          criticalEvents: criticalEvents.events,
          attackTypes: attackTypes.map((item: any) => ({
            type: item.attackType,
            count: item._count.attackType
          })),
          topSourceIPs: topSourceIPs.map((item: any) => ({
            ip: item.sourceIp,
            count: item._count.sourceIp
          })),
          blockedAttempts,
          securityStats: securityStats?.eventsByType.find((e: any) => e.type === 'security')?.count || 0,
          totalEvents: securityStats?.totalEvents || 0
        }
      });
    } catch (error) {
      logger.error('Error getting security dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get security dashboard data'
      });
    }
  }

  // Get user activity summary
  static async getUserActivity(req: Request, res: Response): Promise<void> {
    try {
      const { userId, days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));

      const [
        userEvents,
        activityByType,
        activityByAction,
        loginAttempts,
        failedActions
      ] = await Promise.all([
        auditService.getAuditEvents({
          userId: userId as string,
          startDate,
          limit: 100
        }),
        prisma.auditLog.groupBy({
          by: ['type'],
          where: {
            userId: userId as string,
            timestamp: { gte: startDate }
          },
          _count: { type: true },
          orderBy: { _count: { type: 'desc' } }
        }),
        prisma.auditLog.groupBy({
          by: ['action'],
          where: {
            userId: userId as string,
            timestamp: { gte: startDate }
          },
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 10
        }),
        prisma.auditLog.count({
          where: {
            userId: userId as string,
            action: 'login',
            timestamp: { gte: startDate }
          }
        }),
        prisma.auditLog.count({
          where: {
            userId: userId as string,
            status: 'failure',
            timestamp: { gte: startDate }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          userEvents: userEvents.events,
          activityByType: activityByType.map((item: any) => ({
            type: item.type,
            count: item._count.type
          })),
          activityByAction: activityByAction.map((item: any) => ({
            action: item.action,
            count: item._count.action
          })),
          loginAttempts,
          failedActions,
          totalEvents: userEvents.total
        }
      });
    } catch (error) {
      logger.error('Error getting user activity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user activity data'
      });
    }
  }

  // Get system performance metrics
  static async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { hours = 24 } = req.query;
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - parseInt(hours as string));

      const [
        systemEvents,
        performanceMetrics,
        errorRates,
        apiMetrics
      ] = await Promise.all([
        auditService.getAuditEvents({
          type: 'system',
          startDate,
          limit: 100
        }),
        prisma.auditLog.findMany({
          where: {
            type: 'system',
            performance: { not: null } as any,
            timestamp: { gte: startDate }
          },
          select: {
            performance: true,
            timestamp: true,
            component: true
          },
          orderBy: { timestamp: 'desc' },
          take: 1000
        }),
        prisma.auditLog.groupBy({
          by: ['severity'],
          where: {
            type: 'system',
            severity: { in: ['high', 'critical'] },
            timestamp: { gte: startDate }
          },
          _count: { severity: true }
        }),
        prisma.auditLog.groupBy({
          by: ['endpoint'],
          where: {
            type: 'api',
            timestamp: { gte: startDate }
          },
          _avg: { responseTime: true },
          _count: { endpoint: true },
          orderBy: { _count: { endpoint: 'desc' } },
          take: 10
        })
      ]);

      // Calculate average response times
      const avgResponseTime = performanceMetrics.reduce((sum: number, event: any) => {
        const perf = event.performance as any;
        return sum + (perf?.responseTime || 0);
      }, 0) / performanceMetrics.length;

      res.json({
        success: true,
        data: {
          systemEvents: systemEvents.events,
          performanceMetrics: {
            averageResponseTime: avgResponseTime || 0,
            totalEvents: performanceMetrics.length
          },
          errorRates: errorRates.map((item: any) => ({
            severity: item.severity,
            count: item._count.severity
          })),
          apiMetrics: apiMetrics.map((item: any) => ({
            endpoint: item.endpoint,
            averageResponseTime: item._avg.responseTime || 0,
            requestCount: item._count.endpoint
          }))
        }
      });
    } catch (error) {
      logger.error('Error getting system metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system metrics'
      });
    }
  }

  // Cleanup old audit events
  static async cleanupAuditEvents(req: Request, res: Response): Promise<void> {
    try {
      const { retentionDays = 90 } = req.body;
      
      await auditService.cleanupOldEvents(parseInt(retentionDays));

      res.json({
        success: true,
        message: `Cleaned up audit events older than ${retentionDays} days`
      });
    } catch (error) {
      logger.error('Error cleaning up audit events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup audit events'
      });
    }
  }

  // Export audit events
  static async exportAuditEvents(req: Request, res: Response): Promise<void> {
    try {
      const {
        type,
        startDate,
        endDate,
        format = 'json'
      } = req.query;

      const filters = {
        type: type as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: 10000 // Large limit for export
      };

      const result = await auditService.getAuditEvents(filters);

      if (format === 'csv') {
        // Convert to CSV format
        const csv = convertToCSV(result.events);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit_events.csv');
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: result.events,
          total: result.total,
          exportedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Error exporting audit events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export audit events'
      });
    }
  }
}

// Helper function to convert audit events to CSV
function convertToCSV(events: any[]): string {
  if (events.length === 0) return '';

  const headers = [
    'id', 'type', 'action', 'entity', 'entityId', 'userId', 'userRole',
    'shopId', 'ipAddress', 'severity', 'status', 'message', 'timestamp'
  ];

  const csvRows = [headers.join(',')];

  events.forEach(event => {
    const row = headers.map(header => {
      const value = event[header] || '';
      return `"${value.toString().replace(/"/g, '""')}"`;
    });
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}
