import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

// Connect to database with logging
prisma.$connect().then(() => {
  logger.database.connected();
}).catch((error) => {
  logger.database.error(error);
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    const duration = after - before;
    
    logger.database.query(`${params.model}.${params.action}`, {
      duration: `${duration}ms`,
      params: params.args
    });
    
    return result;
  });
}