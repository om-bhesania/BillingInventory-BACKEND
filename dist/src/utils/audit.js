"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = logActivity;
const client_1 = require("../config/client");
async function logActivity(payload) {
    try {
        await client_1.prisma.auditLog.create({ data: payload });
    }
    catch (e) {
        // Non-blocking – never throw from audit
    }
}
