"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apiKeyMiddleware = (req, res, next) => {
    const apiKey = req.headers["authorization"];
    const expectedKey = process.env.API_KEY;
    if (!apiKey || apiKey !== expectedKey) {
        console.log(`[SECURITY] ❌ Blocked request from origin: ${req.headers.origin}, IP: ${req.ip}`);
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
};
exports.default = apiKeyMiddleware;
