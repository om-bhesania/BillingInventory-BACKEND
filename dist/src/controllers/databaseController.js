"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseController = void 0;
const databaseMonitor_1 = require("../utils/databaseMonitor");
class DatabaseController {
    /**
     * Get database health report
     */
    static async getHealthReport(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            // Only allow admin users to access database monitoring
            if (user.role !== 'Admin') {
                return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
            }
            const healthReport = await databaseMonitor_1.DatabaseMonitor.getHealthReport();
            const recommendations = databaseMonitor_1.DatabaseMonitor.generateRecommendations(healthReport);
            res.json({
                success: true,
                data: {
                    ...healthReport,
                    recommendations,
                    generatedAt: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('Error getting database health report:', error);
            res.status(500).json({
                error: 'Failed to get database health report',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Get index usage statistics
     */
    static async getIndexStats(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            if (user.role !== 'Admin') {
                return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
            }
            const indexStats = await databaseMonitor_1.DatabaseMonitor.getIndexStats();
            res.json({
                success: true,
                data: indexStats
            });
        }
        catch (error) {
            console.error('Error getting index stats:', error);
            res.status(500).json({
                error: 'Failed to get index statistics',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Get table access statistics
     */
    static async getTableStats(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            if (user.role !== 'Admin') {
                return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
            }
            const tableStats = await databaseMonitor_1.DatabaseMonitor.getTableStats();
            res.json({
                success: true,
                data: tableStats
            });
        }
        catch (error) {
            console.error('Error getting table stats:', error);
            res.status(500).json({
                error: 'Failed to get table statistics',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Get slow queries
     */
    static async getSlowQueries(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            if (user.role !== 'Admin') {
                return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
            }
            const limit = parseInt(req.query.limit) || 10;
            const slowQueries = await databaseMonitor_1.DatabaseMonitor.getSlowQueries(limit);
            res.json({
                success: true,
                data: slowQueries
            });
        }
        catch (error) {
            console.error('Error getting slow queries:', error);
            res.status(500).json({
                error: 'Failed to get slow queries',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Get unused indexes
     */
    static async getUnusedIndexes(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            if (user.role !== 'Admin') {
                return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
            }
            const unusedIndexes = await databaseMonitor_1.DatabaseMonitor.getUnusedIndexes();
            res.json({
                success: true,
                data: unusedIndexes
            });
        }
        catch (error) {
            console.error('Error getting unused indexes:', error);
            res.status(500).json({
                error: 'Failed to get unused indexes',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Analyze query performance
     */
    static async analyzeQuery(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            if (user.role !== 'Admin') {
                return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
            }
            const { query } = req.body;
            if (!query) {
                return res.status(400).json({ error: 'Query is required' });
            }
            const analysis = await databaseMonitor_1.DatabaseMonitor.analyzeQuery(query);
            res.json({
                success: true,
                data: analysis
            });
        }
        catch (error) {
            console.error('Error analyzing query:', error);
            res.status(500).json({
                error: 'Failed to analyze query',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Update database statistics
     */
    static async updateStatistics(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            if (user.role !== 'Admin') {
                return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
            }
            await databaseMonitor_1.DatabaseMonitor.updateStatistics();
            res.json({
                success: true,
                message: 'Database statistics updated successfully'
            });
        }
        catch (error) {
            console.error('Error updating statistics:', error);
            res.status(500).json({
                error: 'Failed to update statistics',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Get database size information
     */
    static async getDatabaseSize(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            if (user.role !== 'Admin') {
                return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
            }
            const dbSize = await databaseMonitor_1.DatabaseMonitor.getDatabaseSize();
            res.json({
                success: true,
                data: dbSize
            });
        }
        catch (error) {
            console.error('Error getting database size:', error);
            res.status(500).json({
                error: 'Failed to get database size',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
exports.DatabaseController = DatabaseController;
