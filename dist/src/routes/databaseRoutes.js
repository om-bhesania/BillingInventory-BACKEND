"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const databaseController_1 = require("../controllers/databaseController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use((req, res, next) => {
    (0, auth_1.authenticateToken)(req, res, next).catch(next);
});
// Database health and monitoring routes
router.get('/health', async (req, res) => { await databaseController_1.DatabaseController.getHealthReport(req, res); });
router.get('/indexes', async (req, res) => { await databaseController_1.DatabaseController.getIndexStats(req, res); });
router.get('/tables', async (req, res) => { await databaseController_1.DatabaseController.getTableStats(req, res); });
router.get('/slow-queries', async (req, res) => { await databaseController_1.DatabaseController.getSlowQueries(req, res); });
router.get('/unused-indexes', async (req, res) => { await databaseController_1.DatabaseController.getUnusedIndexes(req, res); });
router.get('/size', async (req, res) => { await databaseController_1.DatabaseController.getDatabaseSize(req, res); });
// Query analysis and maintenance routes
router.post('/analyze-query', async (req, res) => { await databaseController_1.DatabaseController.analyzeQuery(req, res); });
router.post('/update-statistics', async (req, res) => { await databaseController_1.DatabaseController.updateStatistics(req, res); });
exports.default = router;
