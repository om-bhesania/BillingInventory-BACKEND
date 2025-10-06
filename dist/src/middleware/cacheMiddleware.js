"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheMiddleware = cacheMiddleware;
exports.cacheInvalidationMiddleware = cacheInvalidationMiddleware;
exports.cacheControlMiddleware = cacheControlMiddleware;
exports.etagMiddleware = etagMiddleware;
exports.cacheWarmingMiddleware = cacheWarmingMiddleware;
const redisService_1 = require("../services/redisService");
const cacheDecorator_1 = require("../utils/cacheDecorator");
const logger_1 = require("../utils/logger");
/**
 * Express middleware for caching API responses
 */
function cacheMiddleware(options = {}) {
    const { ttl = cacheDecorator_1.CACHE_TTL.MEDIUM, keyGenerator = defaultKeyGenerator, skipCache = () => false, varyBy = [], skipOnError = true } = options;
    return async (req, res, next) => {
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
            const cached = await redisService_1.redisService.get(cacheKey, { ttl });
            if (cached !== null) {
                logger_1.logger.debug(`Cache hit for ${cacheKey}`);
                // Set cache headers
                res.set('X-Cache', 'HIT');
                res.set('X-Cache-Key', cacheKey);
                return res.json(cached);
            }
            // Cache miss - intercept response
            logger_1.logger.debug(`Cache miss for ${cacheKey}`);
            const originalSend = res.json;
            const originalEnd = res.end;
            let responseBody;
            // Override res.json to capture response
            res.json = function (body) {
                responseBody = body;
                return originalSend.call(this, body);
            };
            // Override res.end to cache response
            res.end = function (chunk) {
                if (responseBody && res.statusCode === 200) {
                    // Cache the response asynchronously
                    redisService_1.redisService.set(cacheKey, responseBody, { ttl }).catch(error => {
                        logger_1.logger.error('Failed to cache response:', error);
                    });
                    // Set cache headers
                    res.set('X-Cache', 'MISS');
                    res.set('X-Cache-Key', cacheKey);
                }
                return originalEnd.call(this, chunk, 'utf8', undefined);
            };
            next();
        }
        catch (error) {
            logger_1.logger.error('Cache middleware error:', error);
            if (skipOnError) {
                // Continue without caching on error
                next();
            }
            else {
                res.status(500).json({ error: 'Cache error' });
            }
        }
    };
}
/**
 * Default cache key generator
 */
function defaultKeyGenerator(req) {
    const baseKey = `${req.method}:${req.originalUrl}`;
    const queryString = req.query ? JSON.stringify(req.query) : '';
    const user = req.user;
    const userId = user?.publicId || 'anonymous';
    return `${baseKey}:${userId}:${queryString}`;
}
/**
 * Cache invalidation middleware
 */
function cacheInvalidationMiddleware(patterns) {
    const patternList = Array.isArray(patterns) ? patterns : [patterns];
    return async (req, res, next) => {
        // Store original methods
        const originalSend = res.json;
        const originalEnd = res.end;
        // Override res.json to invalidate cache after successful response
        res.json = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Invalidate cache asynchronously
                invalidateCachePatterns(patternList, req).catch(error => {
                    logger_1.logger.error('Failed to invalidate cache:', error);
                });
            }
            return originalSend.call(this, body);
        };
        // Override res.end to invalidate cache after successful response
        res.end = function (chunk) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Invalidate cache asynchronously
                invalidateCachePatterns(patternList, req).catch(error => {
                    logger_1.logger.error('Failed to invalidate cache:', error);
                });
            }
            return originalEnd.call(this, chunk, 'utf8', undefined);
        };
        next();
    };
}
/**
 * Invalidate cache patterns
 */
async function invalidateCachePatterns(patterns, req) {
    try {
        const user = req.user;
        const userId = user?.publicId || 'anonymous';
        for (const pattern of patterns) {
            // Replace placeholders in pattern
            const resolvedPattern = pattern
                .replace('{userId}', userId)
                .replace('{method}', req.method)
                .replace('{path}', req.path)
                .replace('{shopId}', req.params.shopId || '*')
                .replace('{productId}', req.params.productId || '*');
            const deletedCount = await redisService_1.redisService.delPattern(resolvedPattern);
            logger_1.logger.debug(`Invalidated ${deletedCount} cache entries for pattern ${resolvedPattern}`);
        }
    }
    catch (error) {
        logger_1.logger.error('Cache invalidation error:', error);
    }
}
/**
 * Cache control headers middleware
 */
function cacheControlMiddleware(maxAge = 300) {
    return (req, res, next) => {
        res.set('Cache-Control', `public, max-age=${maxAge}`);
        res.set('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
        next();
    };
}
/**
 * ETag middleware for conditional requests
 */
function etagMiddleware() {
    return (req, res, next) => {
        const originalSend = res.json;
        const originalEnd = res.end;
        let responseBody;
        // Override res.json to generate ETag
        res.json = function (body) {
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
        res.end = function (chunk) {
            if (chunk && res.statusCode === 200) {
                const etag = generateETag(chunk);
                res.set('ETag', etag);
                // Check if client has cached version
                if (req.headers['if-none-match'] === etag) {
                    res.status(304).end();
                    return res;
                }
            }
            return originalEnd.call(this, chunk, 'utf8', undefined);
        };
        next();
    };
}
/**
 * Generate ETag from content
 */
function generateETag(content) {
    const crypto = require('crypto');
    return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
}
/**
 * Cache warming middleware
 */
function cacheWarmingMiddleware() {
    return async (req, res, next) => {
        // This middleware can be used to warm cache on specific routes
        // Implementation depends on specific warming strategies
        next();
    };
}
