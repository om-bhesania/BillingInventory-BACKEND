import { redisService, CacheOptions } from '../services/redisService';
import { logger } from './logger';

export interface CacheConfig extends CacheOptions {
  keyGenerator?: (...args: any[]) => string;
  skipCache?: (...args: any[]) => boolean;
  onHit?: (key: string, result: any) => void;
  onMiss?: (key: string) => void;
}

/**
 * Cache decorator for class methods
 */
export function Cache(config: CacheConfig = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = async function (...args: any[]) {
      // Generate cache key
      const keyGenerator = config.keyGenerator || defaultKeyGenerator;
      const cacheKey = keyGenerator(className, propertyName, ...args);

      // Check if we should skip cache
      if (config.skipCache && config.skipCache(...args)) {
        logger.debug(`Cache skipped for ${cacheKey}`);
        return await method.apply(this, args);
      }

      try {
        // Try to get from cache
        const cached = await redisService.get(cacheKey, config);
        
        if (cached !== null) {
          logger.debug(`Cache hit for ${cacheKey}`);
          config.onHit?.(cacheKey, cached);
          return cached;
        }

        // Cache miss - execute method
        logger.debug(`Cache miss for ${cacheKey}`);
        config.onMiss?.(cacheKey);
        
        const result = await method.apply(this, args);
        
        // Store in cache
        await redisService.set(cacheKey, result, config);
        logger.debug(`Cached result for ${cacheKey}`);
        
        return result;
      } catch (error) {
        logger.error(`Cache error for ${cacheKey}:`, error);
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
export async function cacheFunction<T>(
  key: string,
  fn: () => Promise<T>,
  config: CacheConfig = {}
): Promise<T> {
  try {
    // Try to get from cache
    const cached = await redisService.get<T>(key, config);
    
    if (cached !== null) {
      logger.debug(`Cache hit for ${key}`);
      config.onHit?.(key, cached);
      return cached;
    }

    // Cache miss - execute function
    logger.debug(`Cache miss for ${key}`);
    config.onMiss?.(key);
    
    const result = await fn();
    
    // Store in cache
    await redisService.set(key, result, config);
    logger.debug(`Cached result for ${key}`);
    
    return result;
  } catch (error) {
    logger.error(`Cache error for ${key}:`, error);
    // Fallback to original function if cache fails
    return await fn();
  }
}

/**
 * Default key generator
 */
function defaultKeyGenerator(className: string, methodName: string, ...args: any[]): string {
  const argsHash = args.length > 0 ? 
    args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(':') : 'no-args';
  
  return `${className}:${methodName}:${argsHash}`;
}

/**
 * Cache invalidation decorator
 */
export function CacheInvalidate(patterns: string | string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const className = target.constructor.name;
    const patternList = Array.isArray(patterns) ? patterns : [patterns];

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);
      
      // Invalidate cache patterns
      try {
        for (const pattern of patternList) {
          const fullPattern = pattern.replace('{className}', className);
          const deletedCount = await redisService.delPattern(fullPattern);
          logger.debug(`Invalidated ${deletedCount} cache entries for pattern ${fullPattern}`);
        }
      } catch (error) {
        logger.error('Cache invalidation error:', error);
      }
      
      return result;
    };

    return descriptor;
  };
}

/**
 * Cache warming utility
 */
export class CacheWarmer {
  private static warmingTasks: Array<() => Promise<void>> = [];

  static addWarmingTask(task: () => Promise<void>): void {
    this.warmingTasks.push(task);
  }

  static async warmCache(): Promise<void> {
    logger.info('Starting cache warming...');
    
    const results = await Promise.allSettled(
      this.warmingTasks.map(task => task())
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Cache warming completed: ${successful} successful, ${failed} failed`);

    if (failed > 0) {
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason);
      logger.error('Cache warming errors:', errors);
    }
  }
}

/**
 * Cache key constants
 */
export const CACHE_KEYS = {
  // User related
  USER: 'user',
  USER_BY_ID: (id: string) => `user:${id}`,
  USER_BY_EMAIL: (email: string) => `user:email:${email}`,
  USER_PERMISSIONS: (userId: string) => `user:permissions:${userId}`,
  
  // Product related
  PRODUCTS: 'products',
  PRODUCT_BY_ID: (id: string) => `product:${id}`,
  PRODUCTS_BY_CATEGORY: (categoryId: string) => `products:category:${categoryId}`,
  PRODUCTS_BY_FLAVOR: (flavorId: string) => `products:flavor:${flavorId}`,
  PRODUCTS_ACTIVE: 'products:active',
  
  // Shop related
  SHOPS: 'shops',
  SHOP_BY_ID: (id: string) => `shop:${id}`,
  SHOPS_BY_MANAGER: (managerId: string) => `shops:manager:${managerId}`,
  SHOPS_ACTIVE: 'shops:active',
  
  // Inventory related
  SHOP_INVENTORY: (shopId: string) => `inventory:shop:${shopId}`,
  SHOP_INVENTORY_ITEM: (shopId: string, productId: string) => `inventory:${shopId}:${productId}`,
  LOW_STOCK_ITEMS: (shopId?: string) => shopId ? `low-stock:${shopId}` : 'low-stock:all',
  
  // Dashboard related
  DASHBOARD_METRICS: (userId: string, dateRange?: string) => 
    `dashboard:${userId}${dateRange ? `:${dateRange}` : ''}`,
  
  // Search related
  SEARCH_RESULTS: (query: string, modules?: string) => 
    `search:${query}${modules ? `:${modules}` : ''}`,
  
  // Billing related
  BILLING_BY_SHOP: (shopId: string, dateRange?: string) => 
    `billing:shop:${shopId}${dateRange ? `:${dateRange}` : ''}`,
  BILLING_BY_ID: (id: string) => `billing:${id}`,
  
  // Notifications
  NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
  NOTIFICATIONS_UNREAD: (userId: string) => `notifications:unread:${userId}`,
  
  // Categories and Flavors
  CATEGORIES: 'categories',
  CATEGORIES_ACTIVE: 'categories:active',
  FLAVORS: 'flavors',
  FLAVORS_ACTIVE: 'flavors:active',
  
  // Restock requests
  RESTOCK_REQUESTS: (shopId?: string) => shopId ? `restock:${shopId}` : 'restock:all',
  RESTOCK_REQUESTS_PENDING: (shopId?: string) => 
    shopId ? `restock:pending:${shopId}` : 'restock:pending:all',
} as const;

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400, // 24 hours
  USER_SESSION: 7200, // 2 hours
  DASHBOARD: 600,  // 10 minutes
  SEARCH: 300,     // 5 minutes
  STATIC_DATA: 86400, // 24 hours
} as const;
