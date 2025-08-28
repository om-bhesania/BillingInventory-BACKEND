"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const logger_1 = require("./utils/logger");
const startupBanner_1 = require("./utils/startupBanner");
const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
// Print startup banner
(0, startupBanner_1.printStartupBanner)();
(0, startupBanner_1.printEnvironmentInfo)(PORT, NODE_ENV);
// Log server startup
logger_1.logger.server.start(PORT, NODE_ENV);
app_1.default.listen(PORT, () => {
    logger_1.logger.server.ready(PORT);
    (0, startupBanner_1.printRoutesInfo)(PORT);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_1.logger.server.shutdown('SIGTERM received');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.logger.server.shutdown('SIGINT received');
    process.exit(0);
});
exports.default = app_1.default;
