"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRateLimiter = exports.userRateLimiter = exports.lenientRateLimiter = exports.moderateRateLimiter = exports.strictRateLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
const logger_1 = require("../utils/logger");
// Simple in-memory store for rate limiting
// In production, use Redis or a proper cache
const requestCounts = new Map();
function createRateLimiter(config) {
    return (req, res, next) => {
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
        }
        else if (current.count < config.maxRequests) {
            // Within limit
            current.count++;
            next();
        }
        else {
            // Rate limit exceeded
            logger_1.logger.middleware.rateLimit(key || '', current.count);
            res.status(429).json({
                error: 'Too many requests',
                message: `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000} seconds.`,
                retryAfter: Math.ceil((current.resetTime - now) / 1000)
            });
        }
    };
}
// Predefined rate limiters for different use cases
exports.strictRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
});
exports.moderateRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
});
exports.lenientRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300, // 300 requests per minute
});
// User-specific rate limiter (uses user ID from JWT)
exports.userRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50, // 50 requests per minute per user
    keyGenerator: (req) => {
        const user = req.user;
        return user?.id || req.ip;
    }
});
// Dashboard-specific rate limiter (allows more frequent access for real-time data)
exports.dashboardRateLimiter = createRateLimiter({
    maxRequests: 30, // 30 requests per minute for dashboard
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => {
        // Use user ID for user-specific rate limiting
        const user = req.user;
        return user ? `dashboard_${user.id}` : req.ip;
    }
});
