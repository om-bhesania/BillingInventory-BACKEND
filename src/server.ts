 
import app from "./app";
import { logger } from "./utils/logger";
import { printStartupBanner, printEnvironmentInfo, printRoutesInfo } from "./utils/startupBanner";

const PORT:number = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Print startup banner
printStartupBanner();
printEnvironmentInfo(PORT, NODE_ENV);

// Log server startup
logger.server.start(PORT, NODE_ENV);

app.listen(PORT, () => {
  logger.server.ready(PORT);
  printRoutesInfo(PORT);
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