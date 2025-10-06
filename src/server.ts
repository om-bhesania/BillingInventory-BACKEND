 
import app from "./app";
import { logger } from "./utils/logger";
import { printStartupBanner, printEnvironmentInfo, printRoutesInfo } from "./utils/startupBanner";
import { createServer } from 'http';
import { getSocketService } from './services/socketService';
import { initializeDashboardWebSocket } from './services/dashboardWebSocketService';

const PORT:number = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Print startup banner
printStartupBanner();
printEnvironmentInfo(PORT, NODE_ENV);

// Log server startup
logger.server.start(PORT, NODE_ENV);

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO service
const socketService = getSocketService();
socketService.initialize(server);

// Initialize Dashboard WebSocket service
const dashboardWebSocketService = initializeDashboardWebSocket(server);

server.listen(PORT, () => {
  logger.server.ready(PORT);
  printRoutesInfo(PORT);
  console.log(`🔌 Socket.IO service initialized and ready`);
  console.log(`📊 Dashboard WebSocket service initialized and ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.server.shutdown('SIGTERM received');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.server.shutdown('SIGINT received');
  process.exit(0);
});

export default app;