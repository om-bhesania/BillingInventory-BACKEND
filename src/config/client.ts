import { PrismaClient } from "@prisma/client";

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});
prisma.$connect().then(() => {
  console.log("Connected to database");
});