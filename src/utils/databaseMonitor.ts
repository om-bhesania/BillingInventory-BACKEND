import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Utility function to convert BigInt values to numbers for JSON serialization
function convertBigIntToNumber(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToNumber(value);
    }
    return converted;
  }
  return obj;
}

export interface IndexStats {
  schemaname: string;
  tableName: string;
  indexName: string;
  scans: number;
  tuplesRead: number;
  tuplesFetched: number;
  size: string;
}

export interface TableStats {
  schemaname: string;
  tableName: string;
  seqScans: number;
  seqTuplesRead: number;
  indexScans: number;
  indexTuplesRead: number;
  size: string;
}

export interface QueryStats {
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  rows: number;
}

export class DatabaseMonitor {
  /**
   * Get index usage statistics
   */
  static async getIndexStats(): Promise<IndexStats[]> {
    try {
      const result = await prisma.$queryRaw<IndexStats[]>`
        SELECT 
          schemaname,
          relname as "tableName",
          indexrelname as "indexName",
          idx_scan as "scans",
          idx_tup_read as "tuplesRead",
          idx_tup_fetch as "tuplesFetched",
          pg_size_pretty(pg_relation_size(indexrelid)) as "size"
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
      `;
      return convertBigIntToNumber(result);
    } catch (error) {
      console.warn('Error getting index stats:', error);
      return [];
    }
  }

  /**
   * Get table access statistics
   */
  static async getTableStats(): Promise<TableStats[]> {
    try {
      const result = await prisma.$queryRaw<TableStats[]>`
        SELECT 
          schemaname,
          relname as "tableName",
          seq_scan as "seqScans",
          seq_tup_read as "seqTuplesRead",
          idx_scan as "indexScans",
          idx_tup_fetch as "indexTuplesRead",
          pg_size_pretty(pg_total_relation_size(relid)) as "size"
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY seq_scan DESC
      `;
      return convertBigIntToNumber(result);
    } catch (error) {
      console.warn('Error getting table stats:', error);
      return [];
    }
  }

  /**
   * Get slow query statistics (requires pg_stat_statements extension)
   */
  static async getSlowQueries(limit: number = 10): Promise<QueryStats[]> {
    try {
      const result = await prisma.$queryRaw<QueryStats[]>`
        SELECT 
          query,
          calls,
          total_time as "totalTime",
          mean_time as "meanTime",
          rows
        FROM pg_stat_statements
        ORDER BY mean_time DESC
        LIMIT ${limit}
      `;
      return convertBigIntToNumber(result);
    } catch (error) {
      console.warn('pg_stat_statements extension not available:', error);
      return [];
    }
  }

  /**
   * Get database size information
   */
  static async getDatabaseSize(): Promise<{ size: string; tables: number; indexes: number }> {
    try {
      const [sizeResult, tableCount, indexCount] = await Promise.all([
        prisma.$queryRaw<[{ size: string }]>`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `,
        prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_schema = 'public'
        `,
        prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*) as count FROM pg_stat_user_indexes 
          WHERE schemaname = 'public'
        `
      ]);

      return convertBigIntToNumber({
        size: sizeResult[0].size,
        tables: tableCount[0].count,
        indexes: indexCount[0].count
      });
    } catch (error) {
      console.warn('Error getting database size:', error);
      return {
        size: 'Unknown',
        tables: 0,
        indexes: 0
      };
    }
  }

  /**
   * Get unused indexes (indexes with 0 scans)
   */
  static async getUnusedIndexes(): Promise<IndexStats[]> {
    try {
      const result = await prisma.$queryRaw<IndexStats[]>`
        SELECT 
          schemaname,
          relname as "tableName",
          indexrelname as "indexName",
          idx_scan as "scans",
          idx_tup_read as "tuplesRead",
          idx_tup_fetch as "tuplesFetched",
          pg_size_pretty(pg_relation_size(indexrelid)) as "size"
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public' 
          AND idx_scan = 0
          AND indexrelname NOT LIKE '%_pkey'
        ORDER BY pg_relation_size(indexrelid) DESC
      `;
      return convertBigIntToNumber(result);
    } catch (error) {
      console.warn('Error getting unused indexes:', error);
      return [];
    }
  }

  /**
   * Get tables with high sequential scan ratio
   */
  static async getTablesWithHighSeqScans(): Promise<TableStats[]> {
    try {
      const result = await prisma.$queryRaw<TableStats[]>`
        SELECT 
          schemaname,
          relname as "tableName",
          seq_scan as "seqScans",
          seq_tup_read as "seqTuplesRead",
          idx_scan as "indexScans",
          idx_tup_fetch as "indexTuplesRead",
          pg_size_pretty(pg_total_relation_size(relid)) as "size"
        FROM pg_stat_user_tables
        WHERE schemaname = 'public' 
          AND seq_scan > idx_scan
          AND seq_scan > 100
        ORDER BY seq_scan DESC
      `;
      return convertBigIntToNumber(result);
    } catch (error) {
      console.warn('Error getting tables with high seq scans:', error);
      return [];
    }
  }

  /**
   * Analyze query performance
   */
  static async analyzeQuery(query: string): Promise<any> {
    try {
      const result = await prisma.$queryRaw`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${prisma.$queryRawUnsafe(query)}
      `;
      return convertBigIntToNumber(result);
    } catch (error) {
      console.warn('Query analysis failed:', error);
      return { error: `Query analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Update table statistics
   */
  static async updateStatistics(): Promise<void> {
    try {
      await prisma.$executeRaw`ANALYZE;`;
    } catch (error) {
      console.warn('Error updating statistics:', error);
      throw new Error(`Failed to update statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get comprehensive database health report
   */
  static async getHealthReport(): Promise<{
    databaseSize: { size: string; tables: number; indexes: number };
    indexStats: IndexStats[];
    tableStats: TableStats[];
    unusedIndexes: IndexStats[];
    highSeqScanTables: TableStats[];
    slowQueries: QueryStats[];
  }> {
    try {
      const [
        databaseSize,
        indexStats,
        tableStats,
        unusedIndexes,
        highSeqScanTables,
        slowQueries
      ] = await Promise.allSettled([
        this.getDatabaseSize(),
        this.getIndexStats(),
        this.getTableStats(),
        this.getUnusedIndexes(),
        this.getTablesWithHighSeqScans(),
        this.getSlowQueries()
      ]);

      return {
        databaseSize: databaseSize.status === 'fulfilled' ? databaseSize.value : { size: 'Unknown', tables: 0, indexes: 0 },
        indexStats: indexStats.status === 'fulfilled' ? indexStats.value : [],
        tableStats: tableStats.status === 'fulfilled' ? tableStats.value : [],
        unusedIndexes: unusedIndexes.status === 'fulfilled' ? unusedIndexes.value : [],
        highSeqScanTables: highSeqScanTables.status === 'fulfilled' ? highSeqScanTables.value : [],
        slowQueries: slowQueries.status === 'fulfilled' ? slowQueries.value : []
      };
    } catch (error) {
      console.warn('Error getting health report:', error);
      return {
        databaseSize: { size: 'Unknown', tables: 0, indexes: 0 },
        indexStats: [],
        tableStats: [],
        unusedIndexes: [],
        highSeqScanTables: [],
        slowQueries: []
      };
    }
  }

  /**
   * Generate performance recommendations
   */
  static generateRecommendations(healthReport: Awaited<ReturnType<typeof DatabaseMonitor.getHealthReport>>): string[] {
    const recommendations: string[] = [];

    // Check for unused indexes
    if (healthReport.unusedIndexes.length > 0) {
      recommendations.push(
        `Consider removing ${healthReport.unusedIndexes.length} unused indexes to improve write performance: ${healthReport.unusedIndexes.map(i => i.indexName).join(', ')}`
      );
    }

    // Check for tables with high sequential scans
    if (healthReport.highSeqScanTables.length > 0) {
      recommendations.push(
        `Consider adding indexes for tables with high sequential scans: ${healthReport.highSeqScanTables.map(t => t.tableName).join(', ')}`
      );
    }

    // Check for slow queries
    if (healthReport.slowQueries.length > 0) {
      const avgSlowQueryTime = healthReport.slowQueries.reduce((sum, q) => sum + q.meanTime, 0) / healthReport.slowQueries.length;
      if (avgSlowQueryTime > 1000) {
        recommendations.push(
          `Found ${healthReport.slowQueries.length} slow queries with average execution time of ${avgSlowQueryTime.toFixed(2)}ms. Consider optimizing these queries.`
        );
      }
    }

    // Check database size
    const dbSizeGB = parseFloat(healthReport.databaseSize.size.replace(/[^\d.]/g, ''));
    if (dbSizeGB > 1) {
      recommendations.push(
        `Database size is ${healthReport.databaseSize.size}. Consider archiving old data or implementing data partitioning.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Database performance looks good! No immediate optimizations needed.');
    }

    return recommendations;
  }
}

export default DatabaseMonitor;
