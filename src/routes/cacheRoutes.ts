import { Router } from 'express';
import { CacheController } from '../controllers/cacheController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  authenticateToken(req, res, next).catch(next);
});

// Cache statistics and management routes
router.get('/stats', async (req, res) => { await CacheController.getCacheStats(req as any, res); });
router.get('/test', async (req, res) => { await CacheController.testConnection(req as any, res); });
router.post('/warm', async (req, res) => { await CacheController.warmCache(req as any, res); });

// Cache clearing routes
router.post('/clear', async (req, res) => { await CacheController.clearAllCache(req as any, res); });
router.post('/clear-pattern', async (req, res) => { await CacheController.clearCacheByPattern(req as any, res); });
router.delete('/user/:userId', async (req, res) => { await CacheController.clearUserCache(req as any, res); });
router.delete('/shop/:shopId', async (req, res) => { await CacheController.clearShopCache(req as any, res); });

// Cache key management routes
router.get('/keys', async (req, res) => { await CacheController.getCacheKeys(req as any, res); });
router.get('/value/:key', async (req, res) => { await CacheController.getCacheValue(req as any, res); });
router.post('/value', async (req, res) => { await CacheController.setCacheValue(req as any, res); });
router.delete('/value/:key', async (req, res) => { await CacheController.deleteCacheValue(req as any, res); });

export default router;
