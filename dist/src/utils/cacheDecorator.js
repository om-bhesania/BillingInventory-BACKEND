"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_TTL = exports.CACHE_KEYS = exports.CacheWarmer = void 0;
exports.Cache = Cache;
exports.cacheFunction = cacheFunction;
exports.CacheInvalidate = CacheInvalidate;
const redisService_1 = require("../services/redisService");
const logger_1 = require("./logger");
/**
 * Cache decorator for class methods
 */
function Cache(config = {}) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        const className = target.constructor.name;
        descriptor.value = async function (...args) {
            // Generate cache key
            const keyGenerator = config.keyGenerator || defaultKeyGenerator;
            const cacheKey = keyGenerator(className, propertyName, ...args);
            // Check if we should skip cache
            if (config.skipCache && config.skipCache(...args)) {
                logger_1.logger.debug(`Cache skipped for ${cacheKey}`);
                return await method.apply(this, args);
            }
            try {
                // Try to get from cache
                const cached = await redisService_1.redisService.get(cacheKey, config);
                if (cached !== null) {
                    logger_1.logger.debug(`Cache hit for ${cacheKey}`);
                    config.onHit?.(cacheKey, cached);
                    return cached;
                }
                // Cache miss - execute method
                logger_1.logger.debug(`Cache miss for ${cacheKey}`);
                config.onMiss?.(cacheKey);
                const result = await method.apply(this, args);
                // Store in cache
                await redisService_1.redisService.set(cacheKey, result, config);
                logger_1.logger.debug(`Cached result for ${cacheKey}`);
                return result;
            }
            catch (error) {
                logger_1.logger.error(`Cache error for ${cacheKey}:`, error);
                // Fallback to original method if cache fails
                return await method.apply(this, args);
            }
        };
        return descriptor;
    };
}
/**
 * Cache function for standalone functions
 */
async function cacheFunction(key, fn, config = {}) {
    try {
        // Try to get from cache
        const cached = await redisService_1.redisService.get(key, config);
        if (cached !== null) {
            logger_1.logger.debug(`Cache hit for ${key}`);
            config.onHit?.(key, cached);
            return cached;
        }
        // Cache miss - execute function
        logger_1.logger.debug(`Cache miss for ${key}`);
        config.onMiss?.(key);
        const result = await fn();
        // Store in cache
        await redisService_1.redisService.set(key, result, config);
        logger_1.logger.debug(`Cached result for ${key}`);
        return result;
    }
    catch (error) {
        logger_1.logger.error(`Cache error for ${key}:`, error);
        // Fallback to original function if cache fails
        return await fn();
    }
}
/**
 * Default key generator
 */
function defaultKeyGenerator(className, methodName, ...args) {
    const argsHash = args.length > 0 ?
        args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(':') : 'no-args';
    return `${className}:${methodName}:${argsHash}`;
}
/**
 * Cache invalidation decorator
 */
function CacheInvalidate(patterns) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        const className = target.constructor.name;
        const patternList = Array.isArray(patterns) ? patterns : [patterns];
        descriptor.value = async function (...args) {
            const result = await method.apply(this, args);
            // Invalidate cache patterns
            try {
                for (const pattern of patternList) {
                    const fullPattern = pattern.replace('{className}', className);
                    const deletedCount = await redisService_1.redisService.delPattern(fullPattern);
                    logger_1.logger.debug(`Invalidated ${deletedCount} cache entries for pattern ${fullPattern}`);
                }
            }
            catch (error) {
                logger_1.logger.error('Cache invalidation error:', error);
            }
            return result;
        };
        return descriptor;
    };
}
/**
 * Cache warming utility
 */
class CacheWarmer {
    static addWarmingTask(task) {
        this.warmingTasks.push(task);
    }
    static async warmCache() {
        logger_1.logger.info('Starting cache warming...');
        const results = await Promise.allSettled(this.warmingTasks.map(task => task()));
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        logger_1.logger.info(`Cache warming completed: ${successful} successful, ${failed} failed`);
        if (failed > 0) {
            const errors = results
                .filter(r => r.status === 'rejected')
                .map(r => r.reason);
            logger_1.logger.error('Cache warming errors:', errors);
        }
    }
}
exports.CacheWarmer = CacheWarmer;
CacheWarmer.warmingTasks = [];
/**
 * Cache key constants
 */
exports.CACHE_KEYS = {
    // User related
    USER: 'user',
    USER_BY_ID: (id) => `user:${id}`,
    USER_BY_EMAIL: (email) => `user:email:${email}`,
    USER_PERMISSIONS: (userId) => `user:permissions:${userId}`,
    // Product related
    PRODUCTS: 'products',
    PRODUCT_BY_ID: (id) => `product:${id}`,
    PRODUCTS_BY_CATEGORY: (categoryId) => `products:category:${categoryId}`,
    PRODUCTS_BY_FLAVOR: (flavorId) => `products:flavor:${flavorId}`,
    PRODUCTS_ACTIVE: 'products:active',
    // Shop related
    SHOPS: 'shops',
    SHOP_BY_ID: (id) => `shop:${id}`,
    SHOPS_BY_MANAGER: (managerId) => `shops:manager:${managerId}`,
    SHOPS_ACTIVE: 'shops:active',
    // Inventory related
    SHOP_INVENTORY: (shopId) => `inventory:shop:${shopId}`,
    SHOP_INVENTORY_ITEM: (shopId, productId) => `inventory:${shopId}:${productId}`,
    LOW_STOCK_ITEMS: (shopId) => shopId ? `low-stock:${shopId}` : 'low-stock:all',
    // Dashboard related
    DASHBOARD_METRICS: (userId, dateRange) => `dashboard:${userId}${dateRange ? `:${dateRange}` : ''}`,
    // Search related
    SEARCH_RESULTS: (query, modules) => `search:${query}${modules ? `:${modules}` : ''}`,
    // Billing related
    BILLING_BY_SHOP: (shopId, dateRange) => `billing:shop:${shopId}${dateRange ? `:${dateRange}` : ''}`,
    BILLING_BY_ID: (id) => `billing:${id}`,
    // Notifications
    NOTIFICATIONS: (userId) => `notifications:${userId}`,
    NOTIFICATIONS_UNREAD: (userId) => `notifications:unread:${userId}`,
    // Categories and Flavors
    CATEGORIES: 'categories',
    CATEGORIES_ACTIVE: 'categories:active',
    FLAVORS: 'flavors',
    FLAVORS_ACTIVE: 'flavors:active',
    // Restock requests
    RESTOCK_REQUESTS: (shopId) => shopId ? `restock:${shopId}` : 'restock:all',
    RESTOCK_REQUESTS_PENDING: (shopId) => shopId ? `restock:pending:${shopId}` : 'restock:pending:all',
};
/**
 * Cache TTL constants (in seconds)
 */
exports.CACHE_TTL = {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
    USER_SESSION: 7200, // 2 hours
    DASHBOARD: 600, // 10 minutes
    SEARCH: 300, // 5 minutes
    STATIC_DATA: 86400, // 24 hours
};
