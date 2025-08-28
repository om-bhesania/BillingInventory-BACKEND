"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.business = exports.middleware = exports.controller = exports.api = exports.auth = exports.database = exports.server = exports.logger = void 0;
const console_log_colors_1 = require("console-log-colors");
// Backend Logger Utility
class BackendLogger {
    constructor() {
        this.prefix = '[BACKEND]';
        // Server logs
        this.server = {
            start: (port, env) => {
                console.log(console_log_colors_1.color.green.bold(`${this.prefix} 🚀 SERVER STARTING...`));
                console.log(console_log_colors_1.color.green(`   Port: ${port}`));
                console.log(console_log_colors_1.color.green(`   Environment: ${env}`));
                console.log(console_log_colors_1.color.green(`   URL: http://localhost:${port}`));
            },
            ready: (port) => {
                console.log(console_log_colors_1.color.green.bold(`${this.prefix} ✅ SERVER READY!`));
                console.log(console_log_colors_1.color.green(`   🎉 Bliss Ice Cream Management System is running on port ${port}`));
                console.log(console_log_colors_1.color.green(`   📊 API Documentation: http://localhost:${port}/api-docs`));
                console.log(console_log_colors_1.color.green(`   🔗 Health Check: http://localhost:${port}/health`));
            },
            shutdown: (reason) => {
                console.log(console_log_colors_1.color.yellow.bold(`${this.prefix} 🛑 SERVER SHUTDOWN: ${reason}`));
            }
        };
        // Database logs
        this.database = {
            connect: (url) => {
                console.log(console_log_colors_1.color.blue.bold(`${this.prefix} 🗄️ DATABASE CONNECTING...`));
                console.log(console_log_colors_1.color.blue(`   URL: ${url.replace(/\/\/.*@/, '//***:***@')}`));
            },
            connected: () => {
                console.log(console_log_colors_1.color.green.bold(`${this.prefix} ✅ DATABASE CONNECTED!`));
            },
            error: (error) => {
                console.log(console_log_colors_1.color.red.bold(`${this.prefix} ❌ DATABASE ERROR:`));
                console.log(console_log_colors_1.color.red(`   Error: ${error}`));
            },
            query: (query, params) => {
                console.log(console_log_colors_1.color.cyan.bold(`${this.prefix} 🔍 DATABASE QUERY:`));
                console.log(console_log_colors_1.color.cyan(`   Query: ${query}`));
                if (params)
                    console.log(console_log_colors_1.color.cyan(`   Params: ${JSON.stringify(params, null, 2)}`));
            }
        };
        // Authentication logs
        this.auth = {
            login: (email, success) => {
                const status = success ? console_log_colors_1.color.green('✅ SUCCESS') : console_log_colors_1.color.red('❌ FAILED');
                console.log(console_log_colors_1.color.magenta.bold(`${this.prefix} 🔐 AUTH LOGIN: ${email} - ${status}`));
            },
            logout: (userId) => {
                console.log(console_log_colors_1.color.yellow.bold(`${this.prefix} 🚪 AUTH LOGOUT: User ${userId}`));
            },
            tokenGenerate: (userId, type) => {
                console.log(console_log_colors_1.color.blue.bold(`${this.prefix} 🔑 TOKEN GENERATED: ${type.toUpperCase()} for User ${userId}`));
            },
            tokenValidate: (token, valid) => {
                const status = valid ? console_log_colors_1.color.green('✅ VALID') : console_log_colors_1.color.red('❌ INVALID');
                console.log(console_log_colors_1.color.blue.bold(`${this.prefix} 🔍 TOKEN VALIDATION: ${status}`));
            },
            roleCheck: (userId, role, hasAccess) => {
                const status = hasAccess ? console_log_colors_1.color.green('✅ ACCESS GRANTED') : console_log_colors_1.color.red('❌ ACCESS DENIED');
                console.log(console_log_colors_1.color.magenta.bold(`${this.prefix} 🔒 ROLE CHECK: User ${userId} (${role}) - ${status}`));
            },
            usersListed: (count) => {
                console.log(console_log_colors_1.color.blue.bold(`${this.prefix} 👥 USERS LISTED: ${count} users retrieved`));
            },
            rolesListed: (count) => {
                console.log(console_log_colors_1.color.blue.bold(`${this.prefix} 🏷️ ROLES LISTED: ${count} roles retrieved`));
            }
        };
        // API logs
        this.api = {
            request: (method, path, ip, userAgent) => {
                console.log(console_log_colors_1.color.blue.bold(`${this.prefix} 📡 API REQUEST: ${method} ${path}`));
                console.log(console_log_colors_1.color.blue(`   IP: ${ip}`));
                if (userAgent)
                    console.log(console_log_colors_1.color.blue(`   User-Agent: ${userAgent}`));
            },
            response: (method, path, status, duration) => {
                const statusColor = status >= 200 && status < 300 ? console_log_colors_1.color.green : console_log_colors_1.color.red;
                const durationColor = duration < 100 ? console_log_colors_1.color.green : duration < 500 ? console_log_colors_1.color.yellow : console_log_colors_1.color.red;
                console.log(statusColor.bold(`${this.prefix} 📡 API RESPONSE: ${method} ${path} - ${status}`));
                console.log(durationColor(`   Duration: ${duration}ms`));
            },
            error: (method, path, error) => {
                console.log(console_log_colors_1.color.red.bold(`${this.prefix} ❌ API ERROR: ${method} ${path}`));
                console.log(console_log_colors_1.color.red(`   Error: ${JSON.stringify(error, null, 2)}`));
            }
        };
        // Controller logs
        this.controller = {
            create: (entity, data) => {
                console.log(console_log_colors_1.color.green.bold(`${this.prefix} ➕ CREATE ${entity.toUpperCase()}:`));
                console.log(console_log_colors_1.color.green(`   Data: ${JSON.stringify(data, null, 2)}`));
            },
            read: (entity, id, filters) => {
                console.log(console_log_colors_1.color.blue.bold(`${this.prefix} 👁️ READ ${entity.toUpperCase()}:`));
                if (id)
                    console.log(console_log_colors_1.color.blue(`   ID: ${id}`));
                if (filters)
                    console.log(console_log_colors_1.color.blue(`   Filters: ${JSON.stringify(filters, null, 2)}`));
            },
            update: (entity, id, data) => {
                console.log(console_log_colors_1.color.yellow.bold(`${this.prefix} ✏️ UPDATE ${entity.toUpperCase()}: ${id}`));
                console.log(console_log_colors_1.color.yellow(`   Data: ${JSON.stringify(data, null, 2)}`));
            },
            delete: (entity, id) => {
                console.log(console_log_colors_1.color.red.bold(`${this.prefix} 🗑️ DELETE ${entity.toUpperCase()}: ${id}`));
            }
        };
        // Middleware logs
        this.middleware = {
            cors: (origin) => {
                console.log(console_log_colors_1.color.cyan.bold(`${this.prefix} 🌐 CORS: Request from ${origin}`));
            },
            auth: (path, hasToken) => {
                const status = hasToken ? console_log_colors_1.color.green('✅ TOKEN PRESENT') : console_log_colors_1.color.red('❌ NO TOKEN');
                console.log(console_log_colors_1.color.magenta.bold(`${this.prefix} 🔐 AUTH MIDDLEWARE: ${path} - ${status}`));
            },
            rateLimit: (ip, limit) => {
                console.log(console_log_colors_1.color.yellow.bold(`${this.prefix} ⏱️ RATE LIMIT: IP ${ip} - ${limit} requests`));
            }
        };
        // Business logic logs
        this.business = {
            shopCreated: (shopName, ownerId) => {
                console.log(console_log_colors_1.color.green.bold(`${this.prefix} 🏪 SHOP CREATED: ${shopName}`));
                if (ownerId)
                    console.log(console_log_colors_1.color.green(`   Owner ID: ${ownerId}`));
            },
            inventoryUpdated: (productName, quantity) => {
                console.log(console_log_colors_1.color.blue.bold(`${this.prefix} 📦 INVENTORY UPDATED: ${productName} - Qty: ${quantity}`));
            },
            invoiceGenerated: (invoiceNumber, amount) => {
                console.log(console_log_colors_1.color.magenta.bold(`${this.prefix} 🧾 INVOICE GENERATED: ${invoiceNumber} - Amount: $${amount}`));
            },
            restockRequest: (productName, quantity) => {
                console.log(console_log_colors_1.color.yellow.bold(`${this.prefix} 📋 RESTOCK REQUEST: ${productName} - Qty: ${quantity}`));
            }
        };
        // General logs
        this.info = (message, data) => {
            console.log(console_log_colors_1.color.cyan.bold(`${this.prefix} ℹ️ INFO: ${message}`));
            if (data)
                console.log(console_log_colors_1.color.cyan(`   Data: ${JSON.stringify(data, null, 2)}`));
        };
        this.warn = (message, data) => {
            console.log(console_log_colors_1.color.yellow.bold(`${this.prefix} ⚠️ WARNING: ${message}`));
            if (data)
                console.log(console_log_colors_1.color.yellow(`   Data: ${JSON.stringify(data, null, 2)}`));
        };
        this.error = (message, error) => {
            console.log(console_log_colors_1.color.red.bold(`${this.prefix} ❌ ERROR: ${message}`));
            if (error)
                console.log(console_log_colors_1.color.red(`   Error: ${JSON.stringify(error, null, 2)}`));
        };
        this.success = (message, data) => {
            console.log(console_log_colors_1.color.green.bold(`${this.prefix} ✅ SUCCESS: ${message}`));
            if (data)
                console.log(console_log_colors_1.color.green(`   Data: ${JSON.stringify(data, null, 2)}`));
        };
        this.debug = (message, data) => {
            console.log(console_log_colors_1.color.gray.bold(`${this.prefix} 🐛 DEBUG: ${message}`));
            if (data)
                console.log(console_log_colors_1.color.gray(`   Data: ${JSON.stringify(data, null, 2)}`));
        };
    }
}
// Create and export a singleton instance
exports.logger = new BackendLogger();
// Export individual loggers for convenience
exports.server = exports.logger.server, exports.database = exports.logger.database, exports.auth = exports.logger.auth, exports.api = exports.logger.api, exports.controller = exports.logger.controller, exports.middleware = exports.logger.middleware, exports.business = exports.logger.business;
