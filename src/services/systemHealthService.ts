import { prisma } from '../config/client';
import { logger } from '../utils/logger';
import { getDashboardWebSocketService } from './dashboardWebSocketService';

interface SystemHealth {
  status: 'excellent' | 'good' | 'warning' | 'critical';
  score: number; // 0-100
  timestamp: Date;
  metrics: {
    database: {
      status: 'healthy' | 'warning' | 'critical';
      responseTime: number;
      connections: number;
      errors: number;
    };
    websocket: {
      status: 'healthy' | 'warning' | 'critical';
      connectedUsers: number;
      messageRate: number;
      errors: number;
    };
    api: {
      status: 'healthy' | 'warning' | 'critical';
      responseTime: number;
      errorRate: number;
      requestsPerMinute: number;
    };
    memory: {
      status: 'healthy' | 'warning' | 'critical';
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      status: 'healthy' | 'warning' | 'critical';
      used: number;
      total: number;
      percentage: number;
    };
  };
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }>;
  recommendations: Array<{
    id: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
  }>;
}

export class SystemHealthService {
  private healthHistory: SystemHealth[] = [];
  private alertHistory: Map<string, Date> = new Map();
  private readonly MAX_HISTORY = 100;

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const timestamp = new Date();
      
      // Get all metrics in parallel
      const [
        databaseHealth,
        websocketHealth,
        apiHealth,
        memoryHealth,
        diskHealth
      ] = await Promise.all([
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

      const health: SystemHealth = {
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

    } catch (error) {
      logger.error('Error getting system health:', error);
      throw error;
    }
  }

  private async getDatabaseHealth(): Promise<{ status: 'healthy' | 'warning' | 'critical'; responseTime: number; connections: number; errors: number }> {
    const startTime = Date.now();
    
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      // Get connection info (simplified)
      const connections = 1; // This would need actual connection pool info
      
      return {
        status: (responseTime < 100 ? 'healthy' : responseTime < 500 ? 'warning' : 'critical') as 'healthy' | 'warning' | 'critical',
        responseTime,
        connections,
        errors: 0
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        connections: 0,
        errors: 1
      };
    }
  }

  private async getWebSocketHealth(): Promise<{ status: 'healthy' | 'warning' | 'critical'; connectedUsers: number; messageRate: number; errors: number }> {
    try {
      const dashboardService = getDashboardWebSocketService();
      const connectedUsers = dashboardService?.getConnectedUsersCount() || 0;
      
      // Simulate message rate (in real implementation, track actual message rate)
      const messageRate = 0; // This would be tracked over time
      const errors = 0; // This would be tracked over time

      return {
        status: (connectedUsers > 0 ? 'healthy' : 'warning') as 'healthy' | 'warning' | 'critical',
        connectedUsers,
        messageRate,
        errors
      };
    } catch (error) {
      logger.error('WebSocket health check failed:', error);
      return {
        status: 'critical',
        connectedUsers: 0,
        messageRate: 0,
        errors: 1
      };
    }
  }

  private async getApiHealth(): Promise<{ status: 'healthy' | 'warning' | 'critical'; responseTime: number; errorRate: number; requestsPerMinute: number }> {
    // Simulate API health metrics
    // In real implementation, these would be tracked over time
    const responseTime = 50; // Average response time in ms
    const errorRate = 0.01; // 1% error rate
    const requestsPerMinute = 100; // Requests per minute

    return {
      status: (errorRate < 0.05 && responseTime < 200 ? 'healthy' : 
              errorRate < 0.1 && responseTime < 500 ? 'warning' : 'critical') as 'healthy' | 'warning' | 'critical',
      responseTime,
      errorRate,
      requestsPerMinute
    };
  }

  private getMemoryHealth(): { status: 'healthy' | 'warning' | 'critical'; used: number; total: number; percentage: number } {
    const memUsage = process.memoryUsage();
    const total = memUsage.heapTotal;
    const used = memUsage.heapUsed;
    const percentage = (used / total) * 100;

    return {
      status: (percentage < 70 ? 'healthy' : percentage < 85 ? 'warning' : 'critical') as 'healthy' | 'warning' | 'critical',
      used,
      total,
      percentage
    };
  }

  private getDiskHealth(): { status: 'healthy' | 'warning' | 'critical'; used: number; total: number; percentage: number } {
    // Simulate disk usage (in real implementation, use fs.stat or similar)
    const total = 100 * 1024 * 1024 * 1024; // 100GB
    const used = 30 * 1024 * 1024 * 1024; // 30GB
    const percentage = (used / total) * 100;

    return {
      status: (percentage < 70 ? 'healthy' : percentage < 85 ? 'warning' : 'critical') as 'healthy' | 'warning' | 'critical',
      used,
      total,
      percentage
    };
  }

  private calculateOverallScore(metrics: SystemHealth['metrics']): number {
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
      const weight = weights[key as keyof typeof weights];
      const score = this.getMetricScore(metric);
      totalScore += score * weight;
      totalWeight += weight;
    });

    return Math.round(totalScore / totalWeight);
  }

  private getMetricScore(metric: any): number {
    const statusScores = {
      healthy: 100,
      warning: 60,
      critical: 20
    };

    let baseScore = statusScores[metric.status as keyof typeof statusScores] || 0;

    // Adjust based on specific metrics
    if (metric.responseTime !== undefined) {
      if (metric.responseTime < 100) baseScore += 10;
      else if (metric.responseTime > 1000) baseScore -= 20;
    }

    if (metric.percentage !== undefined) {
      if (metric.percentage < 50) baseScore += 10;
      else if (metric.percentage > 90) baseScore -= 30;
    }

    if (metric.errorRate !== undefined) {
      if (metric.errorRate < 0.01) baseScore += 10;
      else if (metric.errorRate > 0.1) baseScore -= 30;
    }

    return Math.max(0, Math.min(100, baseScore));
  }

  private determineStatus(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  private generateAlerts(metrics: SystemHealth['metrics'], timestamp: Date) {
    const alerts: SystemHealth['alerts'] = [];

    // Database alerts
    if (metrics.database.status === 'critical') {
      alerts.push({
        id: `db_critical_${timestamp.getTime()}`,
        type: 'critical',
        message: `Database is experiencing critical issues. Response time: ${metrics.database.responseTime}ms`,
        timestamp,
        resolved: false
      });
    } else if (metrics.database.status === 'warning') {
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
    } else if (metrics.memory.status === 'warning') {
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

  private generateRecommendations(metrics: SystemHealth['metrics'], score: number) {
    const recommendations: SystemHealth['recommendations'] = [];

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

  private broadcastHealthUpdate(health: SystemHealth) {
    try {
      const dashboardService = getDashboardWebSocketService();
      if (dashboardService) {
        dashboardService.broadcastDashboardUpdate({
          type: 'system_health',
          data: health,
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error('Error broadcasting health update:', error);
    }
  }

  getHealthHistory(): SystemHealth[] {
    return this.healthHistory;
  }

  getHealthTrend(): 'improving' | 'stable' | 'declining' {
    if (this.healthHistory.length < 2) return 'stable';

    const recent = this.healthHistory.slice(0, 5);
    const older = this.healthHistory.slice(5, 10);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.score, 0) / older.length;

    const diff = recentAvg - olderAvg;
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }
}

export const systemHealthService = new SystemHealthService();
