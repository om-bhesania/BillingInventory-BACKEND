"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cacheController_1 = require("../controllers/cacheController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use((req, res, next) => {
    (0, auth_1.authenticateToken)(req, res, next).catch(next);
});
// Cache statistics and management routes
router.get('/stats', async (req, res) => { await cacheController_1.CacheController.getCacheStats(req, res); });
router.get('/test', async (req, res) => { await cacheController_1.CacheController.testConnection(req, res); });
router.post('/warm', async (req, res) => { await cacheController_1.CacheController.warmCache(req, res); });
// Cache clearing routes
router.post('/clear', async (req, res) => { await cacheController_1.CacheController.clearAllCache(req, res); });
router.post('/clear-pattern', async (req, res) => { await cacheController_1.CacheController.clearCacheByPattern(req, res); });
router.delete('/user/:userId', async (req, res) => { await cacheController_1.CacheController.clearUserCache(req, res); });
router.delete('/shop/:shopId', async (req, res) => { await cacheController_1.CacheController.clearShopCache(req, res); });
// Cache key management routes
router.get('/keys', async (req, res) => { await cacheController_1.CacheController.getCacheKeys(req, res); });
router.get('/value/:key', async (req, res) => { await cacheController_1.CacheController.getCacheValue(req, res); });
router.post('/value', async (req, res) => { await cacheController_1.CacheController.setCacheValue(req, res); });
router.delete('/value/:key', async (req, res) => { await cacheController_1.CacheController.deleteCacheValue(req, res); });
exports.default = router;
