import { Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redisService';
import { CACHE_TTL } from '../utils/cacheDecorator';
import { logger } from '../utils/logger';

export interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
  varyBy?: string[]; // Headers to vary cache by
  skipOnError?: boolean;
}

/**
 * Express middleware for caching API responses
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = CACHE_TTL.MEDIUM,
    keyGenerator = defaultKeyGenerator,
    skipCache = () => false,
    varyBy = [],
    skipOnError = true
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if condition is met
    if (skipCache(req)) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator(req);
      
      // Try to get from cache
      const cached = await redisService.get(cacheKey, { ttl });
      
      if (cached !== null) {
        logger.debug(`Cache hit for ${cacheKey}`);
        
        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        return res.json(cached);
      }

      // Cache miss - intercept response
      logger.debug(`Cache miss for ${cacheKey}`);
      
      const originalSend = res.json;
      const originalEnd = res.end;
      let responseBody: any;

      // Override res.json to capture response
      res.json = function(body: any) {
        responseBody = body;
        return originalSend.call(this, body);
      };

      // Override res.end to cache response
      res.end = function(chunk?: any) {
        if (responseBody && res.statusCode === 200) {
          // Cache the response asynchronously
          redisService.set(cacheKey, responseBody, { ttl }).catch(error => {
            logger.error('Failed to cache response:', error);
          });
          
          // Set cache headers
          res.set('X-Cache', 'MISS');
          res.set('X-Cache-Key', cacheKey);
        }
        
        return originalEnd.call(this, chunk, 'utf8' as BufferEncoding, undefined);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      
      if (skipOnError) {
        // Continue without caching on error
        next();
      } else {
        res.status(500).json({ error: 'Cache error' });
      }
    }
  };
}

/**
 * Default cache key generator
 */
function defaultKeyGenerator(req: Request): string {
  const baseKey = `${req.method}:${req.originalUrl}`;
  const queryString = req.query ? JSON.stringify(req.query) : '';
  const user = (req as any).user;
  const userId = user?.publicId || 'anonymous';
  
  return `${baseKey}:${userId}:${queryString}`;
}

/**
 * Cache invalidation middleware
 */
export function cacheInvalidationMiddleware(patterns: string | string[]) {
  const patternList = Array.isArray(patterns) ? patterns : [patterns];

  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original methods
    const originalSend = res.json;
    const originalEnd = res.end;

    // Override res.json to invalidate cache after successful response
    res.json = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Invalidate cache asynchronously
        invalidateCachePatterns(patternList, req).catch(error => {
          logger.error('Failed to invalidate cache:', error);
        });
      }
      
      return originalSend.call(this, body) as Response;
    };

    // Override res.end to invalidate cache after successful response
    res.end = function(chunk?: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Invalidate cache asynchronously
        invalidateCachePatterns(patternList, req).catch(error => {
          logger.error('Failed to invalidate cache:', error);
        });
      }
      
      return originalEnd.call(this, chunk, 'utf8' as BufferEncoding, undefined) as Response;
    };

    next();
  };
}

/**
 * Invalidate cache patterns
 */
async function invalidateCachePatterns(patterns: string[], req: Request): Promise<void> {
  try {
    const user = (req as any).user;
    const userId = user?.publicId || 'anonymous';
    
    for (const pattern of patterns) {
      // Replace placeholders in pattern
      const resolvedPattern = pattern
        .replace('{userId}', userId)
        .replace('{method}', req.method)
        .replace('{path}', req.path)
        .replace('{shopId}', req.params.shopId || '*')
        .replace('{productId}', req.params.productId || '*');
      
      const deletedCount = await redisService.delPattern(resolvedPattern);
      logger.debug(`Invalidated ${deletedCount} cache entries for pattern ${resolvedPattern}`);
    }
  } catch (error) {
    logger.error('Cache invalidation error:', error);
  }
}

/**
 * Cache control headers middleware
 */
export function cacheControlMiddleware(maxAge: number = 300) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    res.set('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
    next();
  };
}

/**
 * ETag middleware for conditional requests
 */
export function etagMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.json;
    const originalEnd = res.end;
    let responseBody: any;

    // Override res.json to generate ETag
    res.json = function(body: any) {
      responseBody = body;
      
      if (body && res.statusCode === 200) {
        // Generate ETag from response body
        const etag = generateETag(JSON.stringify(body));
        res.set('ETag', etag);
        
        // Check if client has cached version
        if (req.headers['if-none-match'] === etag) {
          res.status(304).end();
          return res;
        }
      }
      
      return originalSend.call(this, body);
    };

    // Override res.end to generate ETag
    res.end = function(chunk?: any) {
      if (chunk && res.statusCode === 200) {
        const etag = generateETag(chunk);
        res.set('ETag', etag);
        
        // Check if client has cached version
        if (req.headers['if-none-match'] === etag) {
          res.status(304).end();
          return res;
        }
      }
      
      return originalEnd.call(this, chunk, 'utf8' as BufferEncoding, undefined);
    };

    next();
  };
}

/**
 * Generate ETag from content
 */
function generateETag(content: string): string {
  const crypto = require('crypto');
  return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
}

/**
 * Cache warming middleware
 */
export function cacheWarmingMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // This middleware can be used to warm cache on specific routes
    // Implementation depends on specific warming strategies
    
    next();
  };
}
