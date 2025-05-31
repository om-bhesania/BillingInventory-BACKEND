// prismaMiddleware.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Middleware to automatically filter by userId
prisma.$use(async (params, next) => {
  // Get user from context (we'll set this up)
  const userId = params.args?.userId || params.args?.where?.userId;

  if (params.model && userId) {
    // For find operations
    if (
      params.action === "findMany" ||
      params.action === "findFirst" ||
      params.action === "findUnique"
    ) {
      params.args.where = {
        ...params.args.where,
        userId: userId,
      };
    }

    // For update operations
    if (params.action === "update" || params.action === "updateMany") {
      params.args.where = {
        ...params.args.where,
        userId: userId,
      };
    }

    // For delete operations
    if (params.action === "delete" || params.action === "deleteMany") {
      params.args.where = {
        ...params.args.where,
        userId: userId,
      };
    }

    // For create operations
    if (params.action === "create") {
      params.args.data = {
        ...params.args.data,
        userId: userId,
      };
    }
  }

  return next(params);
});

export default prisma;
export { PrismaClient };