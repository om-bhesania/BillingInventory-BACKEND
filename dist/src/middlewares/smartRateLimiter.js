"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetRateLimitStats = exports.getRateLimitStats = exports.publicRateLimiter = exports.adminRateLimiter = exports.chatRateLimiter = exports.notificationRateLimiter = exports.dashboardRateLimiter = exports.searchRateLimiter = exports.uploadRateLimiter = exports.strictApiRateLimiter = exports.apiRateLimiter = exports.authRateLimiter = exports.smartRateLimiter = void 0;
const logger_1 = require("../utils/logger");
const rateLimitConfig_1 = require("../services/rateLimitConfig");
const advancedRateLimiter_1 = require("./advancedRateLimiter");
// Create rate limiters for each rule
const rateLimiters = new Map();
// Initialize rate limiters
const initializeRateLimiters = () => {
    const rules = [
        'auth', 'api', 'strict_api', 'upload', 'search',
        'dashboard', 'notification', 'chat', 'admin', 'public'
    ];
    rules.forEach(ruleName => {
        const config = (0, rateLimitConfig_1.getRateLimitConfig)(ruleName);
        if (config) {
            rateLimiters.set(ruleName, (0, advancedRateLimiter_1.createAdvancedRateLimiter)(config));
        }
    });
};
// Initialize on module load
initializeRateLimiters();
// Smart rate limiter that automatically selects the appropriate limiter
const smartRateLimiter = (req, res, next) => {
    const startTime = Date.now();
    try {
        // Get the endpoint path
        const endpoint = req.path;
        // Determine which rate limiting rule to apply
        const ruleName = (0, rateLimitConfig_1.getRateLimitRule)(endpoint);
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
        const user = req.user;
        if (user && user.role) {
            const config = (0, rateLimitConfig_1.getRateLimitConfig)(ruleName);
            if (config) {
                const adjustedConfig = (0, rateLimitConfig_1.applyRoleMultiplier)(config, user.role);
                const adjustedLimiter = (0, advancedRateLimiter_1.createAdvancedRateLimiter)(adjustedConfig);
                return adjustedLimiter(req, res, next);
            }
        }
        // Apply the rate limiter
        rateLimiter(req, res, (error) => {
            const responseTime = Date.now() - startTime;
            const blocked = res.statusCode === 429;
            // Record statistics
            rateLimitConfig_1.rateLimitMonitor.recordRequest(endpoint, req.ip || 'unknown', responseTime, blocked);
            if (error) {
                logger_1.logger.error('Rate limiter error:', error);
                return next(error);
            }
            next();
        });
    }
    catch (error) {
        logger_1.logger.error('Smart rate limiter error:', error);
        next(); // Continue on error to avoid blocking requests
    }
};
exports.smartRateLimiter = smartRateLimiter;
// Endpoint-specific rate limiters
const authRateLimiter = (req, res, next) => {
    const limiter = rateLimiters.get('auth');
    if (limiter) {
        return limiter(req, res, next);
    }
    next();
};
exports.authRateLimiter = authRateLimiter;
const apiRateLimiter = (req, res, next) => {
    const limiter = rateLimiters.get('api');
    if (limiter) {
        return limiter(req, res, next);
    }
    next();
};
exports.apiRateLimiter = apiRateLimiter;
const strictApiRateLimiter = (req, res, next) => {
    const limiter = rateLimiters.get('strict_api');
    if (limiter) {
        return limiter(req, res, next);
    }
    next();
};
exports.strictApiRateLimiter = strictApiRateLimiter;
const uploadRateLimiter = (req, res, next) => {
    const limiter = rateLimiters.get('upload');
    if (limiter) {
        return limiter(req, res, next);
    }
    next();
};
exports.uploadRateLimiter = uploadRateLimiter;
const searchRateLimiter = (req, res, next) => {
    const limiter = rateLimiters.get('search');
    if (limiter) {
        return limiter(req, res, next);
    }
    next();
};
exports.searchRateLimiter = searchRateLimiter;
const dashboardRateLimiter = (req, res, next) => {
    const limiter = rateLimiters.get('dashboard');
    if (limiter) {
        return limiter(req, res, next);
    }
    next();
};
exports.dashboardRateLimiter = dashboardRateLimiter;
const notificationRateLimiter = (req, res, next) => {
    const limiter = rateLimiters.get('notification');
    if (limiter) {
        return limiter(req, res, next);
    }
    next();
};
exports.notificationRateLimiter = notificationRateLimiter;
const chatRateLimiter = (req, res, next) => {
    const limiter = rateLimiters.get('chat');
    if (limiter) {
        return limiter(req, res, next);
    }
    next();
};
exports.chatRateLimiter = chatRateLimiter;
const adminRateLimiter = (req, res, next) => {
    const limiter = rateLimiters.get('admin');
    if (limiter) {
        return limiter(req, res, next);
    }
    next();
};
exports.adminRateLimiter = adminRateLimiter;
const publicRateLimiter = (req, res, next) => {
    const limiter = rateLimiters.get('public');
    if (limiter) {
        return limiter(req, res, next);
    }
    next();
};
exports.publicRateLimiter = publicRateLimiter;
// Rate limiting statistics endpoint
const getRateLimitStats = (req, res) => {
    try {
        const stats = rateLimitConfig_1.rateLimitMonitor.getStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting rate limit stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get rate limiting statistics'
        });
    }
};
exports.getRateLimitStats = getRateLimitStats;
// Reset rate limiting statistics
const resetRateLimitStats = (req, res) => {
    try {
        rateLimitConfig_1.rateLimitMonitor.reset();
        res.json({
            success: true,
            message: 'Rate limiting statistics reset successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Error resetting rate limit stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset rate limiting statistics'
        });
    }
};
exports.resetRateLimitStats = resetRateLimitStats;
exports.default = exports.smartRateLimiter;
