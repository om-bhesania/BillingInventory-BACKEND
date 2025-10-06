import { prisma } from '../config/client';
import { logger } from '../utils/logger';
import { Request, Response } from 'express';

export interface AuditEvent {
  id?: string;
  type: 'security' | 'business' | 'system' | 'user' | 'data' | 'api';
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  userRole?: string;
  shopId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failure' | 'warning' | 'info';
  message: string;
  details?: any;
  metadata?: any;
  timestamp?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SecurityEvent extends AuditEvent {
  type: 'security';
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  attackType?: 'brute_force' | 'injection' | 'xss' | 'csrf' | 'ddos' | 'unauthorized_access' | 'data_breach' | 'malware' | 'phishing' | 'other';
  sourceIp?: string;
  targetResource?: string;
  blocked?: boolean;
  mitigationAction?: string;
}

export interface BusinessEvent extends AuditEvent {
  type: 'business';
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
  financialImpact?: number;
  customerImpact?: 'none' | 'low' | 'medium' | 'high';
  operationalImpact?: 'none' | 'low' | 'medium' | 'high';
}

export interface SystemEvent extends AuditEvent {
  type: 'system';
  component: string;
  operation: string;
  performance?: {
    responseTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    diskUsage?: number;
  };
  errorCode?: string;
  stackTrace?: string;
}

export interface UserEvent extends AuditEvent {
  type: 'user';
  userAction: string;
  targetUser?: string;
  permission?: string;
  resource?: string;
  outcome: 'success' | 'failure' | 'denied';
}

export interface DataEvent extends AuditEvent {
  type: 'data';
  dataType: 'create' | 'read' | 'update' | 'delete' | 'export' | 'import';
  dataSensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  dataVolume?: number;
  dataRetention?: number;
  compliance?: string[];
}

export interface ApiEvent extends AuditEvent {
  type: 'api';
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime?: number;
  requestSize?: number;
  responseSize?: number;
  rateLimited?: boolean;
  authenticated?: boolean;
}

class AuditService {
  private static instance: AuditService;
  private eventQueue: AuditEvent[] = [];
  private batchSize = 100;
  private flushInterval = 5000; // 5 seconds
  private isProcessing = false;

  private constructor() {
    this.startBatchProcessor();
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  // Log security events
  public async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.logEvent(securityEvent);
    
    // Immediate alert for critical security events
    if (event.severity === 'critical' || event.threatLevel === 'critical') {
      await this.sendSecurityAlert(securityEvent);
    }
  }

  // Log business events
  public async logBusinessEvent(event: Omit<BusinessEvent, 'id' | 'timestamp' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const businessEvent: BusinessEvent = {
      ...event,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.logEvent(businessEvent);
  }

  // Log system events
  public async logSystemEvent(event: Omit<SystemEvent, 'id' | 'timestamp' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const systemEvent: SystemEvent = {
      ...event,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.logEvent(systemEvent);
  }

  // Log user events
  public async logUserEvent(event: Omit<UserEvent, 'id' | 'timestamp' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const userEvent: UserEvent = {
      ...event,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.logEvent(userEvent);
  }

  // Log data events
  public async logDataEvent(event: Omit<DataEvent, 'id' | 'timestamp' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const dataEvent: DataEvent = {
      ...event,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.logEvent(dataEvent);
  }

  // Log API events
  public async logApiEvent(event: Omit<ApiEvent, 'id' | 'timestamp' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const apiEvent: ApiEvent = {
      ...event,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.logEvent(apiEvent);
  }

  // Generic event logging
  public async logEvent(event: AuditEvent): Promise<void> {
    try {
      // Add to queue for batch processing
      this.eventQueue.push(event);

      // Process immediately for critical events
      if (event.severity === 'critical') {
        await this.processEvent(event);
      }

      // Log to console for development
      if (process.env.NODE_ENV === 'development') {
        logger.info('Audit event:', event);
      }
    } catch (error) {
      logger.error('Failed to queue audit event:', error);
    }
  }

  // Process individual event
  private async processEvent(event: AuditEvent): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          type: event.type,
          action: event.action,
          entity: event.entity,
          entityId: event.entityId || '',
          userId: event.userId,
          userRole: event.userRole,
          shopId: event.shopId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          sessionId: event.sessionId,
          severity: event.severity,
          status: event.status,
          message: event.message,
          details: event.details,
          metadata: event.metadata,
          timestamp: event.timestamp || new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to log audit event:', error);
    }
  }

  // Batch processing
  private startBatchProcessor(): void {
    setInterval(async () => {
      if (this.eventQueue.length > 0 && !this.isProcessing) {
        await this.processBatch();
      }
    }, this.flushInterval);
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;
    const batch = this.eventQueue.splice(0, this.batchSize);

    try {
      await prisma.auditLog.createMany({
        data: batch.map(event => ({
          id: event.id || undefined,
          type: event.type,
          action: event.action,
          entity: event.entity,
          entityId: event.entityId || '',
          userId: event.userId,
          userRole: event.userRole,
          shopId: event.shopId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          sessionId: event.sessionId,
          severity: event.severity,
          status: event.status,
          message: event.message,
          details: event.details,
          metadata: event.metadata,
          timestamp: event.timestamp || new Date()
        }))
      });

      logger.info(`Processed ${batch.length} audit events`);
    } catch (error) {
      logger.error('Failed to process audit batch:', error);
      // Re-queue failed events
      this.eventQueue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  // Security alert system
  private async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    try {
      // Send to security team
      logger.error('Critical security alert:', event);
      
      // Could integrate with external alerting systems
      // await sendSlackAlert(event);
      // await sendEmailAlert(event);
      // await sendSmsAlert(event);
    } catch (error) {
      logger.error('Failed to send security alert:', error);
    }
  }

  // Query audit events
  public async getAuditEvents(filters: {
    type?: string;
    action?: string;
    entity?: string;
    userId?: string;
    shopId?: string;
    severity?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ events: AuditEvent[]; total: number }> {
    try {
      const where: any = {};

      if (filters.type) where.type = filters.type;
      if (filters.action) where.action = filters.action;
      if (filters.entity) where.entity = filters.entity;
      if (filters.userId) where.userId = filters.userId;
      if (filters.shopId) where.shopId = filters.shopId;
      if (filters.severity) where.severity = filters.severity;
      if (filters.status) where.status = filters.status;
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) where.timestamp.gte = filters.startDate;
        if (filters.endDate) where.timestamp.lte = filters.endDate;
      }

      const [events, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: filters.limit || 100,
          skip: filters.offset || 0
        }),
        prisma.auditLog.count({ where })
      ]);

      return { events: events as AuditEvent[], total };
    } catch (error) {
      logger.error('Failed to query audit events:', error);
      return { events: [], total: 0 };
    }
  }

  // Get security events
  public async getSecurityEvents(filters: {
    threatLevel?: string;
    attackType?: string;
    blocked?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ events: SecurityEvent[]; total: number }> {
    try {
      const where: any = { type: 'security' };

      if (filters.threatLevel) where.threatLevel = filters.threatLevel;
      if (filters.attackType) where.attackType = filters.attackType;
      if (filters.blocked !== undefined) where.blocked = filters.blocked;
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) where.timestamp.gte = filters.startDate;
        if (filters.endDate) where.timestamp.lte = filters.endDate;
      }

      const [events, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: filters.limit || 100,
          skip: filters.offset || 0
        }),
        prisma.auditLog.count({ where })
      ]);

      return { events: events as SecurityEvent[], total };
    } catch (error) {
      logger.error('Failed to query security events:', error);
      return { events: [], total: 0 };
    }
  }

  // Get audit statistics
  public async getAuditStatistics(period: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<any> {
    try {
      const now = new Date();
      const startDate = new Date();

      switch (period) {
        case 'hour':
          startDate.setHours(now.getHours() - 1);
          break;
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      const [
        totalEvents,
        securityEvents,
        criticalEvents,
        eventsByType,
        eventsBySeverity,
        topUsers,
        topActions
      ] = await Promise.all([
        prisma.auditLog.count({
          where: { createdAt: { gte: startDate } }
        }),
        prisma.auditLog.count({
          where: { 
            createdAt: { gte: startDate },
            type: 'security'
          }
        }),
        prisma.auditLog.count({
          where: { 
            createdAt: { gte: startDate },
            severity: 'critical'
          }
        }),
        prisma.auditLog.groupBy({
          by: ['type'],
          where: { createdAt: { gte: startDate } },
          _count: { type: true }
        }),
        prisma.auditLog.groupBy({
          by: ['severity'],
          where: { createdAt: { gte: startDate } },
          _count: { severity: true }
        }),
        prisma.auditLog.groupBy({
          by: ['userId'],
          where: { 
            createdAt: { gte: startDate },
            userId: { not: null }
          },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 10
        }),
        prisma.auditLog.groupBy({
          by: ['action'],
          where: { createdAt: { gte: startDate } },
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 10
        })
      ]);

      return {
        period,
        totalEvents,
        securityEvents,
        criticalEvents,
        eventsByType: eventsByType.map(item => ({
          type: item.type,
          count: item._count.type
        })),
        eventsBySeverity: eventsBySeverity.map(item => ({
          severity: item.severity,
          count: item._count.severity
        })),
        topUsers: topUsers.map(item => ({
          userId: item.userId,
          count: item._count.userId
        })),
        topActions: topActions.map(item => ({
          action: item.action,
          count: item._count.action
        }))
      };
    } catch (error) {
      logger.error('Failed to get audit statistics:', error);
      return null;
    }
  }

  // Cleanup old events
  public async cleanupOldEvents(retentionDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await prisma.auditLog.deleteMany({
        where: {
          timestamp: { lt: cutoffDate }
        }
      });

      logger.info(`Cleaned up ${result.count} old audit events`);
    } catch (error) {
      logger.error('Failed to cleanup old audit events:', error);
    }
  }
}

// Export singleton instance
export const auditService = AuditService.getInstance();

// Convenience functions
export const logSecurityEvent = auditService.logSecurityEvent.bind(auditService);
export const logBusinessEvent = auditService.logBusinessEvent.bind(auditService);
export const logSystemEvent = auditService.logSystemEvent.bind(auditService);
export const logUserEvent = auditService.logUserEvent.bind(auditService);
export const logDataEvent = auditService.logDataEvent.bind(auditService);
export const logApiEvent = auditService.logApiEvent.bind(auditService);
export const logEvent = auditService.logEvent.bind(auditService);

// Express middleware for automatic API event logging
export const auditMiddleware = (req: Request, res: Response, next: any) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function(data: any) {
    const responseTime = Date.now() - startTime;
    
    // Log API event
    auditService.logApiEvent({
      type: 'api',
      action: 'request',
      entity: 'api',
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      requestSize: req.get('content-length') ? parseInt(req.get('content-length')!) : 0,
      responseSize: Buffer.byteLength(data || '', 'utf8'),
      rateLimited: res.get('X-RateLimit-Remaining') === '0',
      authenticated: !!(req as any).user,
      userId: (req as any).user?.id,
      userRole: (req as any).user?.role,
      shopId: (req as any).user?.shopId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.get('X-Session-ID'),
      severity: res.statusCode >= 500 ? 'high' : res.statusCode >= 400 ? 'medium' : 'low',
      status: res.statusCode >= 400 ? 'failure' : 'success',
      message: `${req.method} ${req.path} - ${res.statusCode}`,
      details: {
        query: req.query,
        params: req.params,
        headers: req.headers
      }
    });

    return originalSend.call(this, data);
  };

  next();
};
