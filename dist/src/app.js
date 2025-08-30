"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const errorHandlers_1 = require("./middlewares/ErrorHandlers/errorHandlers");
const authRoutes_1 = require("./routes/Auth/authRoutes");
const PingRoute_1 = __importDefault(require("./routes/PingRoute"));
const roleRoutes_1 = __importDefault(require("./routes/Roles/roleRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const flavourRoutes_1 = __importDefault(require("./routes/flavourRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const shopRoutes_1 = __importDefault(require("./routes/shopRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const shopInventoryRoutes_1 = __importDefault(require("./routes/shopInventoryRoutes"));
const restockRequestRoutes_1 = __importDefault(require("./routes/restockRequestRoutes"));
const billingRoutes_1 = __importDefault(require("./routes/billingRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const auditLogRoutes_1 = __importDefault(require("./routes/auditLogRoutes"));
const lowStockRoutes_1 = __importDefault(require("./routes/lowStockRoutes"));
const packagingTypeRoutes_1 = __importDefault(require("./routes/packagingTypeRoutes"));
const swaggerConfig_1 = __importDefault(require("./swaggerConfig"));
// Load environment variables
dotenv_1.default.config();
// Initialize app
const app = (0, express_1.default)();
// CORS Configuration
const corsOptions = {
    origin: (origin, callback) => {
        const allowed = [
            process.env.FRONTEND_ORIGIN || "http://localhost:5173",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
            "http://127.0.0.1:5173",
            "https://s3l06km6-5173.inc1.devtunnels.ms",
            "https://blizz.shreefood.co.in",
            "https://blizz.shreefood.co.in/",
            "https://api.shreefood.co.in",
            "https://shreefood.co.in",
            "https://www.shreefood.co.in",
            "https://www.api.shreefood.co.in",
            // Add common frontend domains
            "https://bliss-frontend.onrender.com",
            "https://bliss-client.onrender.com",
            "https://bliss-app.onrender.com",
            "https://bliss-frontend.vercel.app",
            "https://bliss-client.vercel.app",
            "https://bliss-app.vercel.app",
            // Add any other frontend domains you're using
        ];
        // Log CORS requests for debugging
        console.log(`[CORS] Request from origin: ${origin}`);
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            console.log(`[CORS] ✅ No origin - allowing request`);
            return callback(null, true);
        }
        if (allowed.includes(origin)) {
            console.log(`[CORS] ✅ Allowed origin: ${origin}`);
            return callback(null, true);
        }
        console.log(`[CORS] ❌ Blocked origin: ${origin}`);
        console.log(`[CORS] Allowed origins:`, allowed);
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};
// Middlewares
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Swagger configuration
app.use("/swagger", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerConfig_1.default));
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerConfig_1.default));
// Swagger JSON endpoint
app.get("/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerConfig_1.default);
});
/**
 * @swagger
 * tags:
 *   name: Health Check
 *   description: System health and status endpoints
 */
/**
 * @swagger
 * /ping:
 *   get:
 *     summary: Health check endpoint
 *     description: Simple ping endpoint to check if the server is running
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "pong"
 */
app.get("/ping", (req, res) => {
    res.send("pong");
});
// CORS test endpoint
app.get("/cors-test", (req, res) => {
    res.json({
        message: "CORS test successful",
        origin: req.headers.origin,
        timestamp: new Date().toISOString(),
        cors: "working"
    });
});
// Routes
app.use("/api/auth", authRoutes_1.authRoutes);
app.use("/api/roles", roleRoutes_1.default);
app.use("/api/categories", categoryRoutes_1.default);
app.use("/api/products", productRoutes_1.default);
app.use("/api/flavours", flavourRoutes_1.default);
app.use("/api/shops", shopRoutes_1.default);
app.use("/api/shop-inventory", shopInventoryRoutes_1.default);
app.use("/api/restock-requests", restockRequestRoutes_1.default);
app.use("/api/billing", billingRoutes_1.default);
app.use("/api/notifications", notificationRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/audit-log", auditLogRoutes_1.default);
app.use("/api/low-stock", lowStockRoutes_1.default);
app.use("/api/packaging-types", packagingTypeRoutes_1.default);
app.use("/api/ping", PingRoute_1.default);
// Global Error Handler
app.use(errorHandlers_1.errorHandler);
// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ message: "Route not found" });
});
exports.default = app;
