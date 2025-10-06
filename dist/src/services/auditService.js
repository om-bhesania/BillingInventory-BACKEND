"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMiddleware = exports.logEvent = exports.logApiEvent = exports.logDataEvent = exports.logUserEvent = exports.logSystemEvent = exports.logBusinessEvent = exports.logSecurityEvent = exports.auditService = void 0;
const client_1 = require("../config/client");
const logger_1 = require("../utils/logger");
class AuditService {
    constructor() {
        this.eventQueue = [];
        this.batchSize = 100;
        this.flushInterval = 5000; // 5 seconds
        this.isProcessing = false;
        this.startBatchProcessor();
    }
    static getInstance() {
        if (!AuditService.instance) {
            AuditService.instance = new AuditService();
        }
        return AuditService.instance;
    }
    // Log security events
    async logSecurityEvent(event) {
        const securityEvent = {
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
    async logBusinessEvent(event) {
        const businessEvent = {
            ...event,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await this.logEvent(businessEvent);
    }
    // Log system events
    async logSystemEvent(event) {
        const systemEvent = {
            ...event,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await this.logEvent(systemEvent);
    }
    // Log user events
    async logUserEvent(event) {
        const userEvent = {
            ...event,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await this.logEvent(userEvent);
    }
    // Log data events
    async logDataEvent(event) {
        const dataEvent = {
            ...event,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await this.logEvent(dataEvent);
    }
    // Log API events
    async logApiEvent(event) {
        const apiEvent = {
            ...event,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await this.logEvent(apiEvent);
    }
    // Generic event logging
    async logEvent(event) {
        try {
            // Add to queue for batch processing
            this.eventQueue.push(event);
            // Process immediately for critical events
            if (event.severity === 'critical') {
                await this.processEvent(event);
            }
            // Log to console for development
            if (process.env.NODE_ENV === 'development') {
                logger_1.logger.info('Audit event:', event);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to queue audit event:', error);
        }
    }
    // Process individual event
    async processEvent(event) {
        try {
            await client_1.prisma.auditLog.create({
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
        }
        catch (error) {
            logger_1.logger.error('Failed to log audit event:', error);
        }
    }
    // Batch processing
    startBatchProcessor() {
        setInterval(async () => {
            if (this.eventQueue.length > 0 && !this.isProcessing) {
                await this.processBatch();
            }
        }, this.flushInterval);
    }
    async processBatch() {
        if (this.isProcessing || this.eventQueue.length === 0)
            return;
        this.isProcessing = true;
        const batch = this.eventQueue.splice(0, this.batchSize);
        try {
            await client_1.prisma.auditLog.createMany({
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
            logger_1.logger.info(`Processed ${batch.length} audit events`);
        }
        catch (error) {
            logger_1.logger.error('Failed to process audit batch:', error);
            // Re-queue failed events
            this.eventQueue.unshift(...batch);
        }
        finally {
            this.isProcessing = false;
        }
    }
    // Security alert system
    async sendSecurityAlert(event) {
        try {
            // Send to security team
            logger_1.logger.error('Critical security alert:', event);
            // Could integrate with external alerting systems
            // await sendSlackAlert(event);
            // await sendEmailAlert(event);
            // await sendSmsAlert(event);
        }
        catch (error) {
            logger_1.logger.error('Failed to send security alert:', error);
        }
    }
    // Query audit events
    async getAuditEvents(filters) {
        try {
            const where = {};
            if (filters.type)
                where.type = filters.type;
            if (filters.action)
                where.action = filters.action;
            if (filters.entity)
                where.entity = filters.entity;
            if (filters.userId)
                where.userId = filters.userId;
            if (filters.shopId)
                where.shopId = filters.shopId;
            if (filters.severity)
                where.severity = filters.severity;
            if (filters.status)
                where.status = filters.status;
            if (filters.startDate || filters.endDate) {
                where.timestamp = {};
                if (filters.startDate)
                    where.timestamp.gte = filters.startDate;
                if (filters.endDate)
                    where.timestamp.lte = filters.endDate;
            }
            const [events, total] = await Promise.all([
                client_1.prisma.auditLog.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: filters.limit || 100,
                    skip: filters.offset || 0
                }),
                client_1.prisma.auditLog.count({ where })
            ]);
            return { events: events, total };
        }
        catch (error) {
            logger_1.logger.error('Failed to query audit events:', error);
            return { events: [], total: 0 };
        }
    }
    // Get security events
    async getSecurityEvents(filters) {
        try {
            const where = { type: 'security' };
            if (filters.threatLevel)
                where.threatLevel = filters.threatLevel;
            if (filters.attackType)
                where.attackType = filters.attackType;
            if (filters.blocked !== undefined)
                where.blocked = filters.blocked;
            if (filters.startDate || filters.endDate) {
                where.timestamp = {};
                if (filters.startDate)
                    where.timestamp.gte = filters.startDate;
                if (filters.endDate)
                    where.timestamp.lte = filters.endDate;
            }
            const [events, total] = await Promise.all([
                client_1.prisma.auditLog.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: filters.limit || 100,
                    skip: filters.offset || 0
                }),
                client_1.prisma.auditLog.count({ where })
            ]);
            return { events: events, total };
        }
        catch (error) {
            logger_1.logger.error('Failed to query security events:', error);
            return { events: [], total: 0 };
        }
    }
    // Get audit statistics
    async getAuditStatistics(period = 'day') {
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
            const [totalEvents, securityEvents, criticalEvents, eventsByType, eventsBySeverity, topUsers, topActions] = await Promise.all([
                client_1.prisma.auditLog.count({
                    where: { createdAt: { gte: startDate } }
                }),
                client_1.prisma.auditLog.count({
                    where: {
                        createdAt: { gte: startDate },
                        type: 'security'
                    }
                }),
                client_1.prisma.auditLog.count({
                    where: {
                        createdAt: { gte: startDate },
                        severity: 'critical'
                    }
                }),
                client_1.prisma.auditLog.groupBy({
                    by: ['type'],
                    where: { createdAt: { gte: startDate } },
                    _count: { type: true }
                }),
                client_1.prisma.auditLog.groupBy({
                    by: ['severity'],
                    where: { createdAt: { gte: startDate } },
                    _count: { severity: true }
                }),
                client_1.prisma.auditLog.groupBy({
                    by: ['userId'],
                    where: {
                        createdAt: { gte: startDate },
                        userId: { not: null }
                    },
                    _count: { userId: true },
                    orderBy: { _count: { userId: 'desc' } },
                    take: 10
                }),
                client_1.prisma.auditLog.groupBy({
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
        }
        catch (error) {
            logger_1.logger.error('Failed to get audit statistics:', error);
            return null;
        }
    }
    // Cleanup old events
    async cleanupOldEvents(retentionDays = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
            const result = await client_1.prisma.auditLog.deleteMany({
                where: {
                    timestamp: { lt: cutoffDate }
                }
            });
            logger_1.logger.info(`Cleaned up ${result.count} old audit events`);
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup old audit events:', error);
        }
    }
}
// Export singleton instance
exports.auditService = AuditService.getInstance();
// Convenience functions
exports.logSecurityEvent = exports.auditService.logSecurityEvent.bind(exports.auditService);
exports.logBusinessEvent = exports.auditService.logBusinessEvent.bind(exports.auditService);
exports.logSystemEvent = exports.auditService.logSystemEvent.bind(exports.auditService);
exports.logUserEvent = exports.auditService.logUserEvent.bind(exports.auditService);
exports.logDataEvent = exports.auditService.logDataEvent.bind(exports.auditService);
exports.logApiEvent = exports.auditService.logApiEvent.bind(exports.auditService);
exports.logEvent = exports.auditService.logEvent.bind(exports.auditService);
// Express middleware for automatic API event logging
const auditMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    res.send = function (data) {
        const responseTime = Date.now() - startTime;
        // Log API event
        exports.auditService.logApiEvent({
            type: 'api',
            action: 'request',
            entity: 'api',
            endpoint: req.path,
            method: req.method,
            statusCode: res.statusCode,
            responseTime,
            requestSize: req.get('content-length') ? parseInt(req.get('content-length')) : 0,
            responseSize: Buffer.byteLength(data || '', 'utf8'),
            rateLimited: res.get('X-RateLimit-Remaining') === '0',
            authenticated: !!req.user,
            userId: req.user?.id,
            userRole: req.user?.role,
            shopId: req.user?.shopId,
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
exports.auditMiddleware = auditMiddleware;
