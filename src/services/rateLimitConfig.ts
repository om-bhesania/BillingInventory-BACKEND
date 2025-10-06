import { Request } from 'express';

export interface RateLimitRule {
  name: string;
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  onLimitReached?: (req: Request, res: any, next: any, options: any) => void;
}

export interface RateLimitConfig {
  rules: RateLimitRule[];
  defaultRule: RateLimitRule;
  enabled: boolean;
  redisEnabled: boolean;
  cleanupInterval: number;
}

// Default rate limiting configuration
export const defaultRateLimitConfig: RateLimitConfig = {
  enabled: true,
  redisEnabled: true,
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  defaultRule: {
    name: 'default',
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    standardHeaders: true,
    legacyHeaders: true
  },
  rules: [
    // Authentication endpoints
    {
      name: 'auth',
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      keyGenerator: (req: Request) => `auth:${req.ip}`,
      message: 'Too many authentication attempts. Please try again later.',
      standardHeaders: true,
      legacyHeaders: true
    },
    // API endpoints
    {
      name: 'api',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return user ? `api:user:${user.id}` : `api:ip:${req.ip}`;
      },
      standardHeaders: true,
      legacyHeaders: true
    },
    // Strict API endpoints (sensitive operations)
    {
      name: 'strict_api',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return user ? `strict:user:${user.id}` : `strict:ip:${req.ip}`;
      },
      standardHeaders: true,
      legacyHeaders: true
    },
    // File upload endpoints
    {
      name: 'upload',
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return user ? `upload:user:${user.id}` : `upload:ip:${req.ip}`;
      },
      message: 'Upload rate limit exceeded. Maximum 10 uploads per hour.',
      standardHeaders: true,
      legacyHeaders: true
    },
    // Search endpoints
    {
      name: 'search',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20,
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return user ? `search:user:${user.id}` : `search:ip:${req.ip}`;
      },
      standardHeaders: true,
      legacyHeaders: true
    },
    // Dashboard endpoints
    {
      name: 'dashboard',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50,
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return user ? `dashboard:user:${user.id}` : `dashboard:ip:${req.ip}`;
      },
      standardHeaders: true,
      legacyHeaders: true
    },
    // Notification endpoints
    {
      name: 'notification',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return user ? `notification:user:${user.id}` : `notification:ip:${req.ip}`;
      },
      standardHeaders: true,
      legacyHeaders: true
    },
    // Chat endpoints
    {
      name: 'chat',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return user ? `chat:user:${user.id}` : `chat:ip:${req.ip}`;
      },
      standardHeaders: true,
      legacyHeaders: true
    },
    // Admin endpoints
    {
      name: 'admin',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 200,
      keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return user ? `admin:user:${user.id}` : `admin:ip:${req.ip}`;
      },
      standardHeaders: true,
      legacyHeaders: true
    },
    // Public endpoints (no authentication required)
    {
      name: 'public',
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50,
      keyGenerator: (req: Request) => `public:${req.ip}`,
      standardHeaders: true,
      legacyHeaders: true
    }
  ]
};

// Role-based rate limiting multipliers
export const roleRateLimitMultipliers = {
  'Admin': 3.0,
  'Manager': 2.0,
  'Employee': 1.0,
  'guest': 0.5
};

// Endpoint-specific rate limiting rules
export const endpointRateLimitRules: Record<string, string> = {
  // Authentication
  '/api/auth/login': 'auth',
  '/api/auth/register': 'auth',
  '/api/auth/forgot-password': 'auth',
  '/api/auth/reset-password': 'auth',
  '/api/auth/change-password': 'auth',
  
  // User management
  '/api/users': 'admin',
  '/api/users/create': 'admin',
  '/api/users/update': 'admin',
  '/api/users/delete': 'admin',
  
  // Product management
  '/api/products': 'api',
  '/api/products/create': 'strict_api',
  '/api/products/update': 'strict_api',
  '/api/products/delete': 'strict_api',
  
  // Shop management
  '/api/shops': 'api',
  '/api/shops/create': 'admin',
  '/api/shops/update': 'admin',
  '/api/shops/delete': 'admin',
  
  // Inventory management
  '/api/inventory': 'api',
  '/api/inventory/update': 'strict_api',
  '/api/shop-inventory': 'api',
  '/api/shop-inventory/update': 'strict_api',
  
  // Billing
  '/api/billing': 'api',
  '/api/billing/create': 'strict_api',
  '/api/billing/update': 'strict_api',
  
  // Restock requests
  '/api/restock-requests': 'api',
  '/api/restock-requests/create': 'api',
  '/api/restock-requests/update': 'strict_api',
  
  // Search
  '/api/search': 'search',
  '/api/search/global': 'search',
  
  // Dashboard
  '/api/dashboard': 'dashboard',
  '/api/dashboard/stats': 'dashboard',
  '/api/dashboard/analytics': 'dashboard',
  
  // Notifications
  '/api/notifications': 'notification',
  '/api/notifications/mark-read': 'notification',
  '/api/notifications/clear': 'notification',
  
  // Chat
  '/api/chat': 'chat',
  '/api/chat/messages': 'chat',
  
  // File uploads
  '/api/upload': 'upload',
  '/api/upload/image': 'upload',
  '/api/upload/document': 'upload',
  
  // Public endpoints
  '/api/ping': 'public',
  '/api/health': 'public'
};

// Get rate limit rule for a specific endpoint
export const getRateLimitRule = (endpoint: string): string => {
  // Check for exact match first
  if (endpointRateLimitRules[endpoint]) {
    return endpointRateLimitRules[endpoint];
  }
  
  // Check for pattern matches
  for (const [pattern, rule] of Object.entries(endpointRateLimitRules)) {
    if (endpoint.startsWith(pattern)) {
      return rule;
    }
  }
  
  // Default to API rule
  return 'api';
};

// Get rate limit configuration for a specific rule
export const getRateLimitConfig = (ruleName: string): RateLimitRule | null => {
  const rule = defaultRateLimitConfig.rules.find(r => r.name === ruleName);
  return rule || defaultRateLimitConfig.defaultRule;
};

// Apply role-based multipliers to rate limits
export const applyRoleMultiplier = (config: RateLimitRule, userRole: string): RateLimitRule => {
  const multiplier = roleRateLimitMultipliers[userRole as keyof typeof roleRateLimitMultipliers] || 1;
  
  return {
    ...config,
    maxRequests: Math.floor(config.maxRequests * multiplier)
  };
};

// Dynamic rate limiting based on system load
export const getDynamicRateLimit = (baseConfig: RateLimitRule, systemLoad: number): RateLimitRule => {
  // Reduce rate limits when system load is high
  const loadMultiplier = Math.max(0.1, 1 - (systemLoad * 0.5));
  
  return {
    ...baseConfig,
    maxRequests: Math.floor(baseConfig.maxRequests * loadMultiplier)
  };
};

// Rate limiting statistics
export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  blockedPercentage: number;
  topBlockedIPs: Array<{ ip: string; count: number }>;
  topBlockedEndpoints: Array<{ endpoint: string; count: number }>;
  averageResponseTime: number;
}

// Rate limiting monitoring
export class RateLimitMonitor {
  private stats: Map<string, number> = new Map();
  private blockedStats: Map<string, number> = new Map();
  private endpointStats: Map<string, number> = new Map();
  private responseTimes: number[] = [];

  recordRequest(endpoint: string, ip: string, responseTime: number, blocked: boolean = false) {
    // Record total requests
    const totalKey = `total:${endpoint}`;
    this.stats.set(totalKey, (this.stats.get(totalKey) || 0) + 1);
    
    // Record blocked requests
    if (blocked) {
      const blockedKey = `blocked:${endpoint}`;
      this.blockedStats.set(blockedKey, (this.blockedStats.get(blockedKey) || 0) + 1);
      
      const ipKey = `ip:${ip}`;
      this.blockedStats.set(ipKey, (this.blockedStats.get(ipKey) || 0) + 1);
    }
    
    // Record response time
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000); // Keep last 1000
    }
  }

  getStats(): RateLimitStats {
    const totalRequests = Array.from(this.stats.values()).reduce((sum, count) => sum + count, 0);
    const blockedRequests = Array.from(this.blockedStats.values()).reduce((sum, count) => sum + count, 0);
    
    const topBlockedIPs = Array.from(this.blockedStats.entries())
      .filter(([key]) => key.startsWith('ip:'))
      .map(([key, count]) => ({ ip: key.replace('ip:', ''), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const topBlockedEndpoints = Array.from(this.blockedStats.entries())
      .filter(([key]) => key.startsWith('blocked:'))
      .map(([key, count]) => ({ endpoint: key.replace('blocked:', ''), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const averageResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length 
      : 0;

    return {
      totalRequests,
      blockedRequests,
      blockedPercentage: totalRequests > 0 ? (blockedRequests / totalRequests) * 100 : 0,
      topBlockedIPs,
      topBlockedEndpoints,
      averageResponseTime
    };
  }

  reset() {
    this.stats.clear();
    this.blockedStats.clear();
    this.endpointStats.clear();
    this.responseTimes = [];
  }
}

// Export singleton monitor
export const rateLimitMonitor = new RateLimitMonitor();
