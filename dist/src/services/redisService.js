"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = exports.RedisService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
class RedisService {
    constructor() {
        this.stats = {
            hits: 0,
            misses: 0
        };
        this.redis = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            connectTimeout: 10000,
            commandTimeout: 5000,
        });
        this.redis.on('connect', () => {
            logger_1.logger.info('Redis connected successfully');
        });
        this.redis.on('error', (error) => {
            logger_1.logger.error('Redis connection error:', error);
        });
        this.redis.on('close', () => {
            logger_1.logger.warn('Redis connection closed');
        });
        this.redis.on('reconnecting', () => {
            logger_1.logger.info('Redis reconnecting...');
        });
    }
    /**
     * Get a value from cache
     */
    async get(key, options = {}) {
        try {
            const fullKey = this.buildKey(key, options.prefix);
            const value = await this.redis.get(fullKey);
            if (value === null) {
                this.stats.misses++;
                return null;
            }
            this.stats.hits++;
            if (options.serialize !== false) {
                return JSON.parse(value);
            }
            return value;
        }
        catch (error) {
            logger_1.logger.error('Redis GET error:', error);
            return null;
        }
    }
    /**
     * Set a value in cache
     */
    async set(key, value, options = {}) {
        try {
            const fullKey = this.buildKey(key, options.prefix);
            let serializedValue;
            if (options.serialize !== false) {
                serializedValue = JSON.stringify(value);
            }
            else {
                serializedValue = value;
            }
            if (options.ttl) {
                await this.redis.setex(fullKey, options.ttl, serializedValue);
            }
            else {
                await this.redis.set(fullKey, serializedValue);
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error('Redis SET error:', error);
            return false;
        }
    }
    /**
     * Delete a value from cache
     */
    async del(key, prefix) {
        try {
            const fullKey = this.buildKey(key, prefix);
            const result = await this.redis.del(fullKey);
            return result > 0;
        }
        catch (error) {
            logger_1.logger.error('Redis DEL error:', error);
            return false;
        }
    }
    /**
     * Delete multiple keys matching a pattern
     */
    async delPattern(pattern, prefix) {
        try {
            const fullPattern = this.buildKey(pattern, prefix);
            const keys = await this.redis.keys(fullPattern);
            if (keys.length === 0)
                return 0;
            const result = await this.redis.del(...keys);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Redis DEL pattern error:', error);
            return 0;
        }
    }
    /**
     * Check if a key exists
     */
    async exists(key, prefix) {
        try {
            const fullKey = this.buildKey(key, prefix);
            const result = await this.redis.exists(fullKey);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error('Redis EXISTS error:', error);
            return false;
        }
    }
    /**
     * Set expiration for a key
     */
    async expire(key, ttl, prefix) {
        try {
            const fullKey = this.buildKey(key, prefix);
            const result = await this.redis.expire(fullKey, ttl);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error('Redis EXPIRE error:', error);
            return false;
        }
    }
    /**
     * Get multiple values at once
     */
    async mget(keys, prefix) {
        try {
            const fullKeys = keys.map(key => this.buildKey(key, prefix));
            const values = await this.redis.mget(...fullKeys);
            return values.map(value => {
                if (value === null) {
                    this.stats.misses++;
                    return null;
                }
                this.stats.hits++;
                return JSON.parse(value);
            });
        }
        catch (error) {
            logger_1.logger.error('Redis MGET error:', error);
            return keys.map(() => null);
        }
    }
    /**
     * Set multiple values at once
     */
    async mset(keyValuePairs, options = {}) {
        try {
            const pipeline = this.redis.pipeline();
            for (const [key, value] of Object.entries(keyValuePairs)) {
                const fullKey = this.buildKey(key, options.prefix);
                const serializedValue = options.serialize !== false ? JSON.stringify(value) : value;
                if (options.ttl) {
                    pipeline.setex(fullKey, options.ttl, serializedValue);
                }
                else {
                    pipeline.set(fullKey, serializedValue);
                }
            }
            await pipeline.exec();
            return true;
        }
        catch (error) {
            logger_1.logger.error('Redis MSET error:', error);
            return false;
        }
    }
    /**
     * Increment a numeric value
     */
    async incr(key, prefix) {
        try {
            const fullKey = this.buildKey(key, prefix);
            return await this.redis.incr(fullKey);
        }
        catch (error) {
            logger_1.logger.error('Redis INCR error:', error);
            return 0;
        }
    }
    /**
     * Decrement a numeric value
     */
    async decr(key, prefix) {
        try {
            const fullKey = this.buildKey(key, prefix);
            return await this.redis.decr(fullKey);
        }
        catch (error) {
            logger_1.logger.error('Redis DECR error:', error);
            return 0;
        }
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        try {
            const info = await this.redis.info('memory');
            const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
            const memory = memoryMatch ? memoryMatch[1] : 'Unknown';
            const keys = await this.redis.dbsize();
            const connected = this.redis.status === 'ready';
            return {
                hits: this.stats.hits,
                misses: this.stats.misses,
                keys,
                memory,
                connected
            };
        }
        catch (error) {
            logger_1.logger.error('Redis stats error:', error);
            return {
                hits: this.stats.hits,
                misses: this.stats.misses,
                keys: 0,
                memory: 'Unknown',
                connected: false
            };
        }
    }
    /**
     * Clear all cache data
     */
    async flushAll() {
        try {
            await this.redis.flushall();
            return true;
        }
        catch (error) {
            logger_1.logger.error('Redis FLUSHALL error:', error);
            return false;
        }
    }
    /**
     * Clear cache data for a specific prefix
     */
    async flushPrefix(prefix) {
        return await this.delPattern('*', prefix);
    }
    /**
     * Get all keys matching a pattern
     */
    async keys(pattern, prefix) {
        try {
            const fullPattern = this.buildKey(pattern, prefix);
            return await this.redis.keys(fullPattern);
        }
        catch (error) {
            logger_1.logger.error('Redis KEYS error:', error);
            return [];
        }
    }
    /**
     * Build full cache key with prefix
     */
    buildKey(key, prefix) {
        if (prefix) {
            return `${prefix}:${key}`;
        }
        return key;
    }
    /**
     * Close Redis connection
     */
    async disconnect() {
        try {
            await this.redis.quit();
        }
        catch (error) {
            logger_1.logger.error('Redis disconnect error:', error);
        }
    }
    /**
     * Test Redis connection
     */
    async ping() {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        }
        catch (error) {
            logger_1.logger.error('Redis PING error:', error);
            return false;
        }
    }
}
exports.RedisService = RedisService;
// Export singleton instance
exports.redisService = new RedisService();
exports.default = exports.redisService;
