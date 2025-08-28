import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Simple in-memory store for rate limiting
// In production, use Redis or a proper cache
const requestCounts = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
}

export function createRateLimiter(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = config.keyGenerator ? config.keyGenerator(req) : req.ip;
    
    const current = requestCounts.get(key || '');
    
    if (!current || now > current.resetTime) {
      // First request or window expired
      requestCounts.set(key || '', {
        count: 1,
        resetTime: now + config.windowMs
      });
      next();
    } else if (current.count < config.maxRequests) {
      // Within limit
      current.count++;
      next();
    } else {
      // Rate limit exceeded
      logger.middleware.rateLimit(key || '', current.count);
      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000} seconds.`,
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      });
    }
  };
}

// Predefined rate limiters for different use cases
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
});

export const moderateRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

export const lenientRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 300, // 300 requests per minute
});

// User-specific rate limiter (uses user ID from JWT)
export const userRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50, // 50 requests per minute per user
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user?.id || req.ip;
  }
});

// Dashboard-specific rate limiter (allows more frequent access for real-time data)
export const dashboardRateLimiter = createRateLimiter({
  maxRequests: 30, // 30 requests per minute for dashboard
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (req: any) => {
    // Use user ID for user-specific rate limiting
    const user = (req as any).user;
    return user ? `dashboard_${user.id}` : req.ip;
  }
});

// Dashboard refresh rate limiter (allows refresh only once every 5 minutes)
export const dashboardRefreshRateLimiter = createRateLimiter({
  maxRequests: 1, // 1 refresh per 5 minutes
  windowMs: 5 * 60 * 1000, // 5 minutes
  keyGenerator: (req: any) => {
    // Use user ID for user-specific rate limiting
    const user = (req as any).user;
    return user ? `dashboard_refresh_${user.id}` : req.ip;
  }
});
