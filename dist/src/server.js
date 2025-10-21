"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const logger_1 = require("./utils/logger");
const startupBanner_1 = require("./utils/startupBanner");
const http_1 = require("http");
const socketService_1 = require("./services/socketService");
const dashboardWebSocketService_1 = require("./services/dashboardWebSocketService");
const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
// Print startup banner
(0, startupBanner_1.printStartupBanner)();
(0, startupBanner_1.printEnvironmentInfo)(PORT, NODE_ENV);
// Log server startup
logger_1.logger.server.start(PORT, NODE_ENV);
// Create HTTP server
const server = (0, http_1.createServer)(app_1.default);
// Initialize Socket.IO service
const socketService = (0, socketService_1.getSocketService)();
socketService.initialize(server);
// Initialize Dashboard WebSocket service
(0, dashboardWebSocketService_1.initializeDashboardWebSocket)(server);
server.listen(PORT, () => {
    logger_1.logger.server.ready(PORT);
    (0, startupBanner_1.printRoutesInfo)(PORT);
    console.log(`🔌 Socket.IO service initialized and ready`);
    console.log(`📊 Dashboard WebSocket service initialized and ready`);
});
// Graceful shutdown
process.on("SIGTERM", () => {
    logger_1.logger.server.shutdown("SIGTERM received");
    process.exit(0);
});
process.on("SIGINT", () => {
    logger_1.logger.server.shutdown("SIGINT received");
    process.exit(0);
});
exports.default = app_1.default;
