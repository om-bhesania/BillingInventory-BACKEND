import express from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  listNotifications,
  markNotificationRead,
  markAllRead,
  getAllNotifications,
  createNotification,
  sseSubscribe,
  clearNotification,
  clearAllNotifications,
} from "../controllers/NotificationsController";

const notificationRoutes = express.Router();

// all routes secured
notificationRoutes.use(authenticateToken as any);

notificationRoutes.get("/", listNotifications);
notificationRoutes.get("/admin/all", getAllNotifications); // Admin-only endpoint
notificationRoutes.post("/create", createNotification);
notificationRoutes.post("/read/:id", markNotificationRead);
notificationRoutes.post("/read-all", markAllRead);
notificationRoutes.post("/clear/:id", clearNotification);
notificationRoutes.post("/clear-all", clearAllNotifications);
notificationRoutes.get("/stream", sseSubscribe);

export default notificationRoutes;


