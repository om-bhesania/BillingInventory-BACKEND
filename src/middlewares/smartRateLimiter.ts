import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { 
  getRateLimitRule, 
  getRateLimitConfig, 
  applyRoleMultiplier, 
  rateLimitMonitor 
} from '../services/rateLimitConfig';
import { createAdvancedRateLimiter } from './advancedRateLimiter';

// Create rate limiters for each rule
const rateLimiters = new Map<string, any>();

// Initialize rate limiters
const initializeRateLimiters = () => {
  const rules = [
    'auth', 'api', 'strict_api', 'upload', 'search', 
    'dashboard', 'notification', 'chat', 'admin', 'public'
  ];

  rules.forEach(ruleName => {
    const config = getRateLimitConfig(ruleName);
    if (config) {
      rateLimiters.set(ruleName, createAdvancedRateLimiter(config));
    }
  });
};

// Initialize on module load
initializeRateLimiters();

// Smart rate limiter that automatically selects the appropriate limiter
export const smartRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  try {
    // Get the endpoint path
    const endpoint = req.path;
    
    // Determine which rate limiting rule to apply
    const ruleName = getRateLimitRule(endpoint);
    
    // Get the rate limiter for this rule
    const rateLimiter = rateLimiters.get(ruleName);
    
    if (!rateLimiter) {
      // Fallback to default API rate limiter
      const defaultLimiter = rateLimiters.get('api');
      if (defaultLimiter) {
        return defaultLimiter(req, res, next);
      }
      return next();
    }

    // Apply role-based adjustments if user is authenticated
    const user = (req as any).user;
    if (user && user.role) {
      const config = getRateLimitConfig(ruleName);
      if (config) {
        const adjustedConfig = applyRoleMultiplier(config, user.role);
        const adjustedLimiter = createAdvancedRateLimiter(adjustedConfig);
        return adjustedLimiter(req, res, next);
      }
    }

    // Apply the rate limiter
    rateLimiter(req, res, (error?: any) => {
      const responseTime = Date.now() - startTime;
      const blocked = res.statusCode === 429;
      
      // Record statistics
      rateLimitMonitor.recordRequest(endpoint, req.ip || 'unknown', responseTime, blocked);
      
      if (error) {
        logger.error('Rate limiter error:', error);
        return next(error);
      }
      
      next();
    });

  } catch (error) {
    logger.error('Smart rate limiter error:', error);
    next(); // Continue on error to avoid blocking requests
  }
};

// Endpoint-specific rate limiters
export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const limiter = rateLimiters.get('auth');
  if (limiter) {
    return limiter(req, res, next);
  }
  next();
};

export const apiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const limiter = rateLimiters.get('api');
  if (limiter) {
    return limiter(req, res, next);
  }
  next();
};

export const strictApiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const limiter = rateLimiters.get('strict_api');
  if (limiter) {
    return limiter(req, res, next);
  }
  next();
};

export const uploadRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const limiter = rateLimiters.get('upload');
  if (limiter) {
    return limiter(req, res, next);
  }
  next();
};

export const searchRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const limiter = rateLimiters.get('search');
  if (limiter) {
    return limiter(req, res, next);
  }
  next();
};

export const dashboardRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const limiter = rateLimiters.get('dashboard');
  if (limiter) {
    return limiter(req, res, next);
  }
  next();
};

export const notificationRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const limiter = rateLimiters.get('notification');
  if (limiter) {
    return limiter(req, res, next);
  }
  next();
};

export const chatRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const limiter = rateLimiters.get('chat');
  if (limiter) {
    return limiter(req, res, next);
  }
  next();
};

export const adminRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const limiter = rateLimiters.get('admin');
  if (limiter) {
    return limiter(req, res, next);
  }
  next();
};

export const publicRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const limiter = rateLimiters.get('public');
  if (limiter) {
    return limiter(req, res, next);
  }
  next();
};

// Rate limiting statistics endpoint
export const getRateLimitStats = (req: Request, res: Response) => {
  try {
    const stats = rateLimitMonitor.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting rate limit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limiting statistics'
    });
  }
};

// Reset rate limiting statistics
export const resetRateLimitStats = (req: Request, res: Response) => {
  try {
    rateLimitMonitor.reset();
    res.json({
      success: true,
      message: 'Rate limiting statistics reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting rate limit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset rate limiting statistics'
    });
  }
};

export default smartRateLimiter;
