"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlewares/auth");
const NotificationsController_1 = require("../controllers/NotificationsController");
const notificationRoutes = express_1.default.Router();
// all routes secured
notificationRoutes.use(auth_1.authenticateToken);
notificationRoutes.get("/", NotificationsController_1.listNotifications);
notificationRoutes.get("/admin/all", NotificationsController_1.getAllNotifications); // Admin-only endpoint
notificationRoutes.post("/create", NotificationsController_1.createNotification);
notificationRoutes.post("/read/:id", NotificationsController_1.markNotificationRead);
notificationRoutes.post("/read-all", NotificationsController_1.markAllRead);
notificationRoutes.post("/clear/:id", NotificationsController_1.clearNotification);
notificationRoutes.post("/clear-all", NotificationsController_1.clearAllNotifications);
notificationRoutes.get("/stream", NotificationsController_1.sseSubscribe);
exports.default = notificationRoutes;
