import { Request, Response } from 'express';
import { redisService, CacheStats } from '../services/redisService';
import { CACHE_KEYS, CACHE_TTL } from '../utils/cacheDecorator';
import { AuthenticatedRequest } from '../types/models';

export class CacheController {
  /**
   * Get cache statistics
   */
  static async getCacheStats(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Only allow admin users to access cache statistics
      if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }

      const stats = await redisService.getStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      res.status(500).json({ 
        error: 'Failed to get cache statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clear all cache
   */
  static async clearAllCache(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }

      const success = await redisService.flushAll();
      
      if (success) {
        res.json({
          success: true,
          message: 'All cache cleared successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to clear cache'
        });
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ 
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clear cache by pattern
   */
  static async clearCacheByPattern(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }

      const { pattern } = req.body as { pattern: string };
      if (!pattern) {
        return res.status(400).json({ error: 'Pattern is required' });
      }

      const deletedCount = await redisService.delPattern(pattern);
      
      res.json({
        success: true,
        message: `Cleared ${deletedCount} cache entries matching pattern: ${pattern}`,
        deletedCount
      });
    } catch (error) {
      console.error('Error clearing cache by pattern:', error);
      res.status(500).json({ 
        error: 'Failed to clear cache by pattern',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clear cache for specific user
   */
  static async clearUserCache(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { userId } = req.params as { userId: string };
      
      // Users can only clear their own cache, admins can clear any user's cache
      if (user.role !== 'Admin' && user.publicId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const patterns = [
        `user:${userId}`,
        `user:email:*`,
        `user:permissions:${userId}`,
        `dashboard:${userId}*`,
        `notifications:${userId}*`,
        `search:*:${userId}*`
      ];

      let totalDeleted = 0;
      for (const pattern of patterns) {
        const deleted = await redisService.delPattern(pattern);
        totalDeleted += deleted;
      }
      
      res.json({
        success: true,
        message: `Cleared ${totalDeleted} cache entries for user ${userId}`,
        deletedCount: totalDeleted
      });
    } catch (error) {
      console.error('Error clearing user cache:', error);
      res.status(500).json({ 
        error: 'Failed to clear user cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clear cache for specific shop
   */
  static async clearShopCache(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shopId } = req.params as { shopId: string };
      
      // Check if user has access to this shop
      const userShopIds = user.shopIds || [];
      if (user.role !== 'Admin' && !userShopIds.includes(shopId)) {
        return res.status(403).json({ error: 'Access denied to this shop' });
      }

      const patterns = [
        `shop:${shopId}`,
        `inventory:shop:${shopId}*`,
        `low-stock:${shopId}`,
        `billing:shop:${shopId}*`,
        `restock:${shopId}*`
      ];

      let totalDeleted = 0;
      for (const pattern of patterns) {
        const deleted = await redisService.delPattern(pattern);
        totalDeleted += deleted;
      }
      
      res.json({
        success: true,
        message: `Cleared ${totalDeleted} cache entries for shop ${shopId}`,
        deletedCount: totalDeleted
      });
    } catch (error) {
      console.error('Error clearing shop cache:', error);
      res.status(500).json({ 
        error: 'Failed to clear shop cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get cache keys matching a pattern
   */
  static async getCacheKeys(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }

      const { pattern = '*' } = req.query as { pattern?: string };
      const keys = await redisService.keys(pattern as string);
      
      res.json({
        success: true,
        data: {
          keys,
          count: keys.length
        }
      });
    } catch (error) {
      console.error('Error getting cache keys:', error);
      res.status(500).json({ 
        error: 'Failed to get cache keys',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get cache value by key
   */
  static async getCacheValue(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }

      const { key } = req.params as { key: string };
      const value = await redisService.get(key);
      
      res.json({
        success: true,
        data: {
          key,
          value,
          exists: value !== null
        }
      });
    } catch (error) {
      console.error('Error getting cache value:', error);
      res.status(500).json({ 
        error: 'Failed to get cache value',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Set cache value
   */
  static async setCacheValue(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }

      const { key, value, ttl } = req.body as { key: string; value: any; ttl?: number };
      
      if (!key || value === undefined) {
        return res.status(400).json({ error: 'Key and value are required' });
      }

      const success = await redisService.set(key, value, { ttl });
      
      if (success) {
        res.json({
          success: true,
          message: 'Cache value set successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to set cache value'
        });
      }
    } catch (error) {
      console.error('Error setting cache value:', error);
      res.status(500).json({ 
        error: 'Failed to set cache value',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete cache value
   */
  static async deleteCacheValue(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }

      const { key } = req.params as { key: string };
      const success = await redisService.del(key);
      
      if (success) {
        res.json({
          success: true,
          message: 'Cache value deleted successfully'
        });
      } else {
        res.json({
          success: false,
          message: 'Cache key not found or already deleted'
        });
      }
    } catch (error) {
      console.error('Error deleting cache value:', error);
      res.status(500).json({ 
        error: 'Failed to delete cache value',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test Redis connection
   */
  static async testConnection(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }

      const isConnected = await redisService.ping();
      
      res.json({
        success: true,
        data: {
          connected: isConnected,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error testing Redis connection:', error);
      res.status(500).json({ 
        error: 'Failed to test Redis connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Warm cache with common data
   */
  static async warmCache(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }

      // This would typically call cache warming functions
      // Implementation depends on specific warming strategies
      
      res.json({
        success: true,
        message: 'Cache warming initiated'
      });
    } catch (error) {
      console.error('Error warming cache:', error);
      res.status(500).json({ 
        error: 'Failed to warm cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
