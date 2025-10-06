"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemHealthService = exports.SystemHealthService = void 0;
const client_1 = require("../config/client");
const logger_1 = require("../utils/logger");
const dashboardWebSocketService_1 = require("./dashboardWebSocketService");
class SystemHealthService {
    constructor() {
        this.healthHistory = [];
        this.alertHistory = new Map();
        this.MAX_HISTORY = 100;
    }
    async getSystemHealth() {
        try {
            const timestamp = new Date();
            // Get all metrics in parallel
            const [databaseHealth, websocketHealth, apiHealth, memoryHealth, diskHealth] = await Promise.all([
                this.getDatabaseHealth(),
                this.getWebSocketHealth(),
                this.getApiHealth(),
                this.getMemoryHealth(),
                this.getDiskHealth()
            ]);
            const metrics = {
                database: databaseHealth,
                websocket: websocketHealth,
                api: apiHealth,
                memory: memoryHealth,
                disk: diskHealth
            };
            // Calculate overall score
            const score = this.calculateOverallScore(metrics);
            const status = this.determineStatus(score);
            // Generate alerts and recommendations
            const alerts = this.generateAlerts(metrics, timestamp);
            const recommendations = this.generateRecommendations(metrics, score);
            const health = {
                status,
                score,
                timestamp,
                metrics,
                alerts,
                recommendations
            };
            // Store in history
            this.healthHistory.unshift(health);
            if (this.healthHistory.length > this.MAX_HISTORY) {
                this.healthHistory = this.healthHistory.slice(0, this.MAX_HISTORY);
            }
            // Broadcast health update
            this.broadcastHealthUpdate(health);
            return health;
        }
        catch (error) {
            logger_1.logger.error('Error getting system health:', error);
            throw error;
        }
    }
    async getDatabaseHealth() {
        const startTime = Date.now();
        try {
            // Test database connection
            await client_1.prisma.$queryRaw `SELECT 1`;
            const responseTime = Date.now() - startTime;
            // Get connection info (simplified)
            const connections = 1; // This would need actual connection pool info
            return {
                status: (responseTime < 100 ? 'healthy' : responseTime < 500 ? 'warning' : 'critical'),
                responseTime,
                connections,
                errors: 0
            };
        }
        catch (error) {
            logger_1.logger.error('Database health check failed:', error);
            return {
                status: 'critical',
                responseTime: Date.now() - startTime,
                connections: 0,
                errors: 1
            };
        }
    }
    async getWebSocketHealth() {
        try {
            const dashboardService = (0, dashboardWebSocketService_1.getDashboardWebSocketService)();
            const connectedUsers = dashboardService?.getConnectedUsersCount() || 0;
            // Simulate message rate (in real implementation, track actual message rate)
            const messageRate = 0; // This would be tracked over time
            const errors = 0; // This would be tracked over time
            return {
                status: (connectedUsers > 0 ? 'healthy' : 'warning'),
                connectedUsers,
                messageRate,
                errors
            };
        }
        catch (error) {
            logger_1.logger.error('WebSocket health check failed:', error);
            return {
                status: 'critical',
                connectedUsers: 0,
                messageRate: 0,
                errors: 1
            };
        }
    }
    async getApiHealth() {
        // Simulate API health metrics
        // In real implementation, these would be tracked over time
        const responseTime = 50; // Average response time in ms
        const errorRate = 0.01; // 1% error rate
        const requestsPerMinute = 100; // Requests per minute
        return {
            status: (errorRate < 0.05 && responseTime < 200 ? 'healthy' :
                errorRate < 0.1 && responseTime < 500 ? 'warning' : 'critical'),
            responseTime,
            errorRate,
            requestsPerMinute
        };
    }
    getMemoryHealth() {
        const memUsage = process.memoryUsage();
        const total = memUsage.heapTotal;
        const used = memUsage.heapUsed;
        const percentage = (used / total) * 100;
        return {
            status: (percentage < 70 ? 'healthy' : percentage < 85 ? 'warning' : 'critical'),
            used,
            total,
            percentage
        };
    }
    getDiskHealth() {
        // Simulate disk usage (in real implementation, use fs.stat or similar)
        const total = 100 * 1024 * 1024 * 1024; // 100GB
        const used = 30 * 1024 * 1024 * 1024; // 30GB
        const percentage = (used / total) * 100;
        return {
            status: (percentage < 70 ? 'healthy' : percentage < 85 ? 'warning' : 'critical'),
            used,
            total,
            percentage
        };
    }
    calculateOverallScore(metrics) {
        const weights = {
            database: 0.3,
            websocket: 0.2,
            api: 0.25,
            memory: 0.15,
            disk: 0.1
        };
        let totalScore = 0;
        let totalWeight = 0;
        Object.entries(metrics).forEach(([key, metric]) => {
            const weight = weights[key];
            const score = this.getMetricScore(metric);
            totalScore += score * weight;
            totalWeight += weight;
        });
        return Math.round(totalScore / totalWeight);
    }
    getMetricScore(metric) {
        const statusScores = {
            healthy: 100,
            warning: 60,
            critical: 20
        };
        let baseScore = statusScores[metric.status] || 0;
        // Adjust based on specific metrics
        if (metric.responseTime !== undefined) {
            if (metric.responseTime < 100)
                baseScore += 10;
            else if (metric.responseTime > 1000)
                baseScore -= 20;
        }
        if (metric.percentage !== undefined) {
            if (metric.percentage < 50)
                baseScore += 10;
            else if (metric.percentage > 90)
                baseScore -= 30;
        }
        if (metric.errorRate !== undefined) {
            if (metric.errorRate < 0.01)
                baseScore += 10;
            else if (metric.errorRate > 0.1)
                baseScore -= 30;
        }
        return Math.max(0, Math.min(100, baseScore));
    }
    determineStatus(score) {
        if (score >= 90)
            return 'excellent';
        if (score >= 75)
            return 'good';
        if (score >= 50)
            return 'warning';
        return 'critical';
    }
    generateAlerts(metrics, timestamp) {
        const alerts = [];
        // Database alerts
        if (metrics.database.status === 'critical') {
            alerts.push({
                id: `db_critical_${timestamp.getTime()}`,
                type: 'critical',
                message: `Database is experiencing critical issues. Response time: ${metrics.database.responseTime}ms`,
                timestamp,
                resolved: false
            });
        }
        else if (metrics.database.status === 'warning') {
            alerts.push({
                id: `db_warning_${timestamp.getTime()}`,
                type: 'warning',
                message: `Database response time is elevated: ${metrics.database.responseTime}ms`,
                timestamp,
                resolved: false
            });
        }
        // Memory alerts
        if (metrics.memory.status === 'critical') {
            alerts.push({
                id: `mem_critical_${timestamp.getTime()}`,
                type: 'critical',
                message: `Memory usage is critical: ${metrics.memory.percentage.toFixed(1)}%`,
                timestamp,
                resolved: false
            });
        }
        else if (metrics.memory.status === 'warning') {
            alerts.push({
                id: `mem_warning_${timestamp.getTime()}`,
                type: 'warning',
                message: `Memory usage is high: ${metrics.memory.percentage.toFixed(1)}%`,
                timestamp,
                resolved: false
            });
        }
        // WebSocket alerts
        if (metrics.websocket.status === 'critical') {
            alerts.push({
                id: `ws_critical_${timestamp.getTime()}`,
                type: 'critical',
                message: 'WebSocket service is down',
                timestamp,
                resolved: false
            });
        }
        // API alerts
        if (metrics.api.status === 'critical') {
            alerts.push({
                id: `api_critical_${timestamp.getTime()}`,
                type: 'critical',
                message: `API error rate is critical: ${(metrics.api.errorRate * 100).toFixed(1)}%`,
                timestamp,
                resolved: false
            });
        }
        return alerts;
    }
    generateRecommendations(metrics, score) {
        const recommendations = [];
        if (score < 75) {
            recommendations.push({
                id: 'overall_health',
                priority: 'high',
                title: 'System Health Improvement',
                description: 'Overall system health is below optimal levels. Review all metrics and address critical issues.',
                action: 'Review system metrics and implement improvements'
            });
        }
        if (metrics.memory.status === 'warning' || metrics.memory.status === 'critical') {
            recommendations.push({
                id: 'memory_optimization',
                priority: metrics.memory.status === 'critical' ? 'high' : 'medium',
                title: 'Memory Optimization',
                description: `Memory usage is at ${metrics.memory.percentage.toFixed(1)}%. Consider optimizing memory usage or increasing available memory.`,
                action: 'Review memory usage patterns and optimize code'
            });
        }
        if (metrics.database.status === 'warning' || metrics.database.status === 'critical') {
            recommendations.push({
                id: 'database_optimization',
                priority: metrics.database.status === 'critical' ? 'high' : 'medium',
                title: 'Database Performance',
                description: `Database response time is ${metrics.database.responseTime}ms. Consider optimizing queries or increasing database resources.`,
                action: 'Review database queries and connection pooling'
            });
        }
        if (metrics.websocket.connectedUsers === 0) {
            recommendations.push({
                id: 'websocket_connectivity',
                priority: 'medium',
                title: 'WebSocket Connectivity',
                description: 'No users are currently connected via WebSocket. Check WebSocket service status.',
                action: 'Verify WebSocket service configuration and connectivity'
            });
        }
        return recommendations;
    }
    broadcastHealthUpdate(health) {
        try {
            const dashboardService = (0, dashboardWebSocketService_1.getDashboardWebSocketService)();
            if (dashboardService) {
                dashboardService.broadcastDashboardUpdate({
                    type: 'system_health',
                    data: health,
                    timestamp: new Date()
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error broadcasting health update:', error);
        }
    }
    getHealthHistory() {
        return this.healthHistory;
    }
    getHealthTrend() {
        if (this.healthHistory.length < 2)
            return 'stable';
        const recent = this.healthHistory.slice(0, 5);
        const older = this.healthHistory.slice(5, 10);
        if (recent.length === 0 || older.length === 0)
            return 'stable';
        const recentAvg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
        const olderAvg = older.reduce((sum, h) => sum + h.score, 0) / older.length;
        const diff = recentAvg - olderAvg;
        if (diff > 5)
            return 'improving';
        if (diff < -5)
            return 'declining';
        return 'stable';
    }
}
exports.SystemHealthService = SystemHealthService;
exports.systemHealthService = new SystemHealthService();
