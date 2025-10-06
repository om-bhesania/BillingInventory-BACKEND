import { Router } from 'express';
import { DatabaseController } from '../controllers/databaseController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  authenticateToken(req, res, next).catch(next);
});

// Database health and monitoring routes
router.get('/health', async (req, res) => { await DatabaseController.getHealthReport(req as any, res); });
router.get('/indexes', async (req, res) => { await DatabaseController.getIndexStats(req as any, res); });
router.get('/tables', async (req, res) => { await DatabaseController.getTableStats(req as any, res); });
router.get('/slow-queries', async (req, res) => { await DatabaseController.getSlowQueries(req as any, res); });
router.get('/unused-indexes', async (req, res) => { await DatabaseController.getUnusedIndexes(req as any, res); });
router.get('/size', async (req, res) => { await DatabaseController.getDatabaseSize(req as any, res); });

// Query analysis and maintenance routes
router.post('/analyze-query', async (req, res) => { await DatabaseController.analyzeQuery(req as any, res); });
router.post('/update-statistics', async (req, res) => { await DatabaseController.updateStatistics(req as any, res); });

export default router;
