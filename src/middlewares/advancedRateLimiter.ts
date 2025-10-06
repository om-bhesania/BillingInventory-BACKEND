import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { RedisService } from '../services/redisService';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  handler?: (req: Request, res: Response, next: NextFunction, options: any) => void;
  onLimitReached?: (req: Request, res: Response, next: NextFunction, options: any) => void;
}

interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

class AdvancedRateLimiter {
  private redis: any;
  private memoryStore: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    this.redis = new RedisService();
  }

  private async getRedisKey(key: string): Promise<string> {
    return `rate_limit:${key}`;
  }

  private async getFromRedis(key: string): Promise<{ count: number; resetTime: number } | null> {
    try {
      if (!this.redis) {
        return this.memoryStore.get(key) || null;
      }

      const redisKey = await this.getRedisKey(key);
      const data = await this.redis.get(redisKey);
      
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      return {
        count: parsed.count,
        resetTime: parsed.resetTime
      };
    } catch (error) {
      logger.error('Redis rate limit error:', error);
      return this.memoryStore.get(key) || null;
    }
  }

  private async setToRedis(key: string, data: { count: number; resetTime: number }, ttl: number): Promise<void> {
    try {
      if (!this.redis) {
        this.memoryStore.set(key, data);
        return;
      }

      const redisKey = await this.getRedisKey(key);
      await this.redis.setex(redisKey, Math.ceil(ttl / 1000), JSON.stringify(data));
    } catch (error) {
      logger.error('Redis rate limit set error:', error);
      this.memoryStore.set(key, data);
    }
  }

  private async incrementRedis(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    try {
      if (!this.redis) {
        const current = this.memoryStore.get(key);
        if (!current || Date.now() > current.resetTime) {
          const newData = { count: 1, resetTime: Date.now() + windowMs };
          this.memoryStore.set(key, newData);
          return newData;
        }
        current.count++;
        return current;
      }

      const redisKey = await this.getRedisKey(key);
      const multi = this.redis.multi();
      
      multi.incr(redisKey);
      multi.expire(redisKey, Math.ceil(windowMs / 1000));
      
      const results = await multi.exec();
      const count = results[0][1];
      const resetTime = Date.now() + windowMs;
      
      return { count, resetTime };
    } catch (error) {
      logger.error('Redis increment error:', error);
      const current = this.memoryStore.get(key);
      if (!current || Date.now() > current.resetTime) {
        const newData = { count: 1, resetTime: Date.now() + windowMs };
        this.memoryStore.set(key, newData);
        return newData;
      }
      current.count++;
      return current;
    }
  }

  createRateLimiter(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const now = Date.now();
      const key = config.keyGenerator ? config.keyGenerator(req) : req.ip;
      
      if (!key) {
        return next();
      }

      try {
        const current = await this.getFromRedis(key);
        
        if (!current || now > current.resetTime) {
          // First request or window expired
          const newData = { count: 1, resetTime: now + config.windowMs };
          await this.setToRedis(key, newData, config.windowMs);
          
          // Add rate limit info to request
          (req as any).rateLimit = {
            limit: config.maxRequests,
            current: 1,
            remaining: config.maxRequests - 1,
            resetTime: newData.resetTime,
            retryAfter: 0
          };

          // Add headers
          if (config.standardHeaders) {
            res.set({
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': (config.maxRequests - 1).toString(),
              'X-RateLimit-Reset': new Date(newData.resetTime).toISOString()
            });
          }

          if (config.legacyHeaders) {
            res.set({
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': (config.maxRequests - 1).toString(),
              'X-RateLimit-Reset': Math.ceil(newData.resetTime / 1000).toString()
            });
          }

          next();
        } else if (current.count < config.maxRequests) {
          // Within limit - increment
          const newData = await this.incrementRedis(key, config.windowMs);
          
          // Add rate limit info to request
          (req as any).rateLimit = {
            limit: config.maxRequests,
            current: newData.count,
            remaining: Math.max(0, config.maxRequests - newData.count),
            resetTime: newData.resetTime,
            retryAfter: 0
          };

          // Add headers
          if (config.standardHeaders) {
            res.set({
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': Math.max(0, config.maxRequests - newData.count).toString(),
              'X-RateLimit-Reset': new Date(newData.resetTime).toISOString()
            });
          }

          if (config.legacyHeaders) {
            res.set({
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': Math.max(0, config.maxRequests - newData.count).toString(),
              'X-RateLimit-Reset': Math.ceil(newData.resetTime / 1000).toString()
            });
          }

          next();
        } else {
          // Rate limit exceeded
          const retryAfter = Math.ceil((current.resetTime - now) / 1000);
          
          logger.middleware.rateLimit(key, current.count);

          // Add rate limit info to request
          (req as any).rateLimit = {
            limit: config.maxRequests,
            current: current.count,
            remaining: 0,
            resetTime: current.resetTime,
            retryAfter
          };

          // Add headers
          if (config.standardHeaders) {
            res.set({
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(current.resetTime).toISOString(),
              'Retry-After': retryAfter.toString()
            });
          }

          if (config.legacyHeaders) {
            res.set({
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString(),
              'Retry-After': retryAfter.toString()
            });
          }

          if (config.onLimitReached) {
            return config.onLimitReached(req, res, next, {
              limit: config.maxRequests,
              current: current.count,
              remaining: 0,
              resetTime: current.resetTime,
              retryAfter
            });
          }

          res.status(429).json({
            error: 'Too many requests',
            message: config.message || `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000} seconds.`,
            retryAfter,
            limit: config.maxRequests,
            remaining: 0,
            resetTime: new Date(current.resetTime).toISOString()
          });
        }
      } catch (error) {
        logger.error('Rate limiter error:', error);
        next(); // Continue on error to avoid blocking requests
      }
    };
  }

  // Clean up expired entries from memory store
  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.memoryStore.entries()) {
      if (now > data.resetTime) {
        this.memoryStore.delete(key);
      }
    }
  }

  // Get rate limit info for a key
  async getRateLimitInfo(key: string): Promise<RateLimitInfo | null> {
    const current = await this.getFromRedis(key);
    if (!current) return null;

    const now = Date.now();
    if (now > current.resetTime) return null;

    return {
      limit: 0, // This would need to be stored with the data
      current: current.count,
      remaining: 0, // This would need to be calculated
      resetTime: current.resetTime,
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    };
  }
}

// Create singleton instance
const advancedRateLimiter = new AdvancedRateLimiter();

// Cleanup memory store every 5 minutes
setInterval(() => {
  advancedRateLimiter.cleanup();
}, 5 * 60 * 1000);

// Export the createRateLimiter function
export const createAdvancedRateLimiter = advancedRateLimiter.createRateLimiter.bind(advancedRateLimiter);

// Predefined advanced rate limiters
export const authRateLimiter = createAdvancedRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  keyGenerator: (req: Request) => `auth:${req.ip}`,
  message: 'Too many authentication attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: true,
  onLimitReached: (req: Request, res: Response) => {
    logger.middleware.rateLimit(req.ip || 'unknown', 0);
    res.status(429).json({
      error: 'Authentication rate limit exceeded',
      message: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: 900
    });
  }
});

export const apiRateLimiter = createAdvancedRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user ? `api:user:${user.id}` : `api:ip:${req.ip}`;
  },
  standardHeaders: true,
  legacyHeaders: true
});

export const strictApiRateLimiter = createAdvancedRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user ? `strict:user:${user.id}` : `strict:ip:${req.ip}`;
  },
  standardHeaders: true,
  legacyHeaders: true
});

export const uploadRateLimiter = createAdvancedRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 uploads per hour
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user ? `upload:user:${user.id}` : `upload:ip:${req.ip}`;
  },
  message: 'Upload rate limit exceeded. Maximum 10 uploads per hour.',
  standardHeaders: true,
  legacyHeaders: true
});

export const searchRateLimiter = createAdvancedRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 searches per minute
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user ? `search:user:${user.id}` : `search:ip:${req.ip}`;
  },
  standardHeaders: true,
  legacyHeaders: true
});

export const dashboardRateLimiter = createAdvancedRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50, // 50 dashboard requests per minute
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user ? `dashboard:user:${user.id}` : `dashboard:ip:${req.ip}`;
  },
  standardHeaders: true,
  legacyHeaders: true
});

export const notificationRateLimiter = createAdvancedRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 notification actions per minute
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user ? `notification:user:${user.id}` : `notification:ip:${req.ip}`;
  },
  standardHeaders: true,
  legacyHeaders: true
});

export const chatRateLimiter = createAdvancedRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 chat messages per minute
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user ? `chat:user:${user.id}` : `chat:ip:${req.ip}`;
  },
  standardHeaders: true,
  legacyHeaders: true
});

// Dynamic rate limiter based on user role
export const createRoleBasedRateLimiter = (baseConfig: RateLimitConfig) => {
  return createAdvancedRateLimiter({
    ...baseConfig,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      const role = user?.role || 'guest';
      const userId = user?.id || req.ip;
      
      // Different limits based on role
      const roleMultipliers = {
        'Admin': 3,
        'Manager': 2,
        'Employee': 1,
        'guest': 0.5
      };
      
      const multiplier = roleMultipliers[role as keyof typeof roleMultipliers] || 1;
      const adjustedMaxRequests = Math.floor(baseConfig.maxRequests * multiplier);
      
      return `${role}:${userId}:${adjustedMaxRequests}`;
    }
  });
};

// Adaptive rate limiter that adjusts based on system load
export const createAdaptiveRateLimiter = (baseConfig: RateLimitConfig) => {
  return createAdvancedRateLimiter({
    ...baseConfig,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      const userId = user?.id || req.ip;
      
      // This would integrate with system monitoring
      // For now, use base config
      return `adaptive:${userId}`;
    }
  });
};

export default advancedRateLimiter;
