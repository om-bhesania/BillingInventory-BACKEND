import cors from "cors";
import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";

import routes from "./routes";
import { errorHandler } from "./middlewares/ErrorHandlers/errorHandlers";
import { PrismaClient } from "@prisma/client";

// Load environment variables
dotenv.config();

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});
prisma.$connect().then(() => {
  console.log("Connected to database");
});

// Export Prisma Client for use in other modules
export { prisma };

// Initialize app
const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/ping", (req: Request, res: Response) => {
  res.send("pong");
});

// Routes
app.use("/api", routes);

// Global Error Handler
app.use(errorHandler);

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
