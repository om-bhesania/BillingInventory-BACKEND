import cors from "cors";
import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";

import { PrismaClient } from "@prisma/client";
import { errorHandler } from "./middlewares/ErrorHandlers/errorHandlers";
import { authRoutes } from "./routes/Auth/authRoutes";
import roleRoutes from "./routes/Roles/roleRoutes";
import categoryRoutes from "./routes/categoryRoutes";

// Load environment variables
dotenv.config();


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
app.use("/api/auth", authRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/categories", categoryRoutes);
// Global Error Handler
app.use(errorHandler);

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
