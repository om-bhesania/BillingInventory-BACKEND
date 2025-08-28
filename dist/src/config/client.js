"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
// Initialize Prisma Client
exports.prisma = new client_1.PrismaClient({
    log: ["query", "info", "warn", "error"],
});
// Connect to database with logging
exports.prisma.$connect().then(() => {
    logger_1.logger.database.connected();
}).catch((error) => {
    logger_1.logger.database.error(error);
});
// Log database queries in development
if (process.env.NODE_ENV === 'development') {
    exports.prisma.$use(async (params, next) => {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();
        const duration = after - before;
        logger_1.logger.database.query(`${params.model}.${params.action}`, {
            duration: `${duration}ms`,
            params: params.args
        });
        return result;
    });
}
