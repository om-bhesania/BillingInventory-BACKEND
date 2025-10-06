import { color, log } from 'console-log-colors';

// Backend Logger Utility
class BackendLogger {
  private prefix = '[BACKEND]';

  // Server logs
  server = {
    start: (port: number, env: string) => {
      console.log(color.green.bold(`${this.prefix} 🚀 SERVER STARTING...`));
      console.log(color.green(`   Port: ${port}`));
      console.log(color.green(`   Environment: ${env}`));
      console.log(color.green(`   URL: http://localhost:${port}`));
    },
    ready: (port: number) => {
      console.log(color.green.bold(`${this.prefix} ✅ SERVER READY!`));
      console.log(color.green(`   🎉 Bliss Ice Cream Management System is running on port ${port}`));
      console.log(color.green(`   📊 API Documentation: http://localhost:${port}/api-docs`));
      console.log(color.green(`   🔗 Health Check: http://localhost:${port}/health`));
    },
    shutdown: (reason: string) => {
      console.log(color.yellow.bold(`${this.prefix} 🛑 SERVER SHUTDOWN: ${reason}`));
    }
  };

  // Database logs
  database = {
    connect: (url: string) => {
      console.log(color.blue.bold(`${this.prefix} 🗄️ DATABASE CONNECTING...`));
      console.log(color.blue(`   URL: ${url.replace(/\/\/.*@/, '//***:***@')}`));
    },
    connected: () => {
      console.log(color.green.bold(`${this.prefix} ✅ DATABASE CONNECTED!`));
    },
    error: (error: any) => {
      console.log(color.red.bold(`${this.prefix} ❌ DATABASE ERROR:`));
      console.log(color.red(`   Error: ${error}`));
    },
    query: (query: string, params?: any) => {
      console.log(color.cyan.bold(`${this.prefix} 🔍 DATABASE QUERY:`));
      console.log(color.cyan(`   Query: ${query}`));
      if (params) console.log(color.cyan(`   Params: ${JSON.stringify(params, null, 2)}`));
    }
  };

  // Authentication logs
  auth = {
    login: (email: string, success: boolean) => {
      const status = success ? color.green('✅ SUCCESS') : color.red('❌ FAILED');
      console.log(color.magenta.bold(`${this.prefix} 🔐 AUTH LOGIN: ${email} - ${status}`));
    },
    logout: (userId: string) => {
      console.log(color.yellow.bold(`${this.prefix} 🚪 AUTH LOGOUT: User ${userId}`));
    },
    tokenGenerate: (userId: string, type: 'access' | 'refresh') => {
      console.log(color.blue.bold(`${this.prefix} 🔑 TOKEN GENERATED: ${type.toUpperCase()} for User ${userId}`));
    },
    tokenValidate: (token: string, valid: boolean) => {
      const status = valid ? color.green('✅ VALID') : color.red('❌ INVALID');
      console.log(color.blue.bold(`${this.prefix} 🔍 TOKEN VALIDATION: ${status}`));
    },
    roleCheck: (userId: string, role: string, hasAccess: boolean) => {
      const status = hasAccess ? color.green('✅ ACCESS GRANTED') : color.red('❌ ACCESS DENIED');
      console.log(color.magenta.bold(`${this.prefix} 🔒 ROLE CHECK: User ${userId} (${role}) - ${status}`));
    },
    usersListed: (count: number) => {
      console.log(color.blue.bold(`${this.prefix} 👥 USERS LISTED: ${count} users retrieved`));
    },
    userDeleted: (deletedUserId: string, deletedBy: string) => {
      console.log(color.red.bold(`${this.prefix} 🗑️ USER DELETED: User ${deletedUserId} deleted by ${deletedBy}`));
    },
    rolesListed: (count: number) => {
      console.log(color.blue.bold(`${this.prefix} 🏷️ ROLES LISTED: ${count} roles retrieved`));
    }
  };

  // API logs
  api = {
    request: (method: string, path: string, ip: string, userAgent?: string) => {
      console.log(color.blue.bold(`${this.prefix} 📡 API REQUEST: ${method} ${path}`));
      console.log(color.blue(`   IP: ${ip}`));
      if (userAgent) console.log(color.blue(`   User-Agent: ${userAgent}`));
    },
    response: (method: string, path: string, status: number, duration: number) => {
      const statusColor = status >= 200 && status < 300 ? color.green : color.red;
      const durationColor = duration < 100 ? color.green : duration < 500 ? color.yellow : color.red;
      console.log(statusColor.bold(`${this.prefix} 📡 API RESPONSE: ${method} ${path} - ${status}`));
      console.log(durationColor(`   Duration: ${duration}ms`));
    },
    error: (method: string, path: string, error: any) => {
      console.log(color.red.bold(`${this.prefix} ❌ API ERROR: ${method} ${path}`));
      console.log(color.red(`   Error: ${JSON.stringify(error, null, 2)}`));
    }
  };

  // Controller logs
  controller = {
    create: (entity: string, data: any) => {
      console.log(color.green.bold(`${this.prefix} ➕ CREATE ${entity.toUpperCase()}:`));
      console.log(color.green(`   Data: ${JSON.stringify(data, null, 2)}`));
    },
    read: (entity: string, id?: string, filters?: any) => {
      console.log(color.blue.bold(`${this.prefix} 👁️ READ ${entity.toUpperCase()}:`));
      if (id) console.log(color.blue(`   ID: ${id}`));
      if (filters) console.log(color.blue(`   Filters: ${JSON.stringify(filters, null, 2)}`));
    },
    update: (entity: string, id: string, data: any) => {
      console.log(color.yellow.bold(`${this.prefix} ✏️ UPDATE ${entity.toUpperCase()}: ${id}`));
      console.log(color.yellow(`   Data: ${JSON.stringify(data, null, 2)}`));
    },
    delete: (entity: string, id: string) => {
      console.log(color.red.bold(`${this.prefix} 🗑️ DELETE ${entity.toUpperCase()}: ${id}`));
    }
  };

  // Middleware logs
  middleware = {
    cors: (origin: string) => {
      console.log(color.cyan.bold(`${this.prefix} 🌐 CORS: Request from ${origin}`));
    },
    auth: (path: string, hasToken: boolean) => {
      const status = hasToken ? color.green('✅ TOKEN PRESENT') : color.red('❌ NO TOKEN');
      console.log(color.magenta.bold(`${this.prefix} 🔐 AUTH MIDDLEWARE: ${path} - ${status}`));
    },
    rateLimit: (ip: string, limit: number) => {
      console.log(color.yellow.bold(`${this.prefix} ⏱️ RATE LIMIT: IP ${ip} - ${limit} requests`));
    }
  };

  // Business logic logs
  business = {
    shopCreated: (shopName: string, ownerId?: string) => {
      console.log(color.green.bold(`${this.prefix} 🏪 SHOP CREATED: ${shopName}`));
      if (ownerId) console.log(color.green(`   Owner ID: ${ownerId}`));
    },
    inventoryUpdated: (productName: string, quantity: number) => {
      console.log(color.blue.bold(`${this.prefix} 📦 INVENTORY UPDATED: ${productName} - Qty: ${quantity}`));
    },
    invoiceGenerated: (invoiceNumber: string, amount: number) => {
      console.log(color.magenta.bold(`${this.prefix} 🧾 INVOICE GENERATED: ${invoiceNumber} - Amount: $${amount}`));
    },
    restockRequest: (productName: string, quantity: number) => {
      console.log(color.yellow.bold(`${this.prefix} 📋 RESTOCK REQUEST: ${productName} - Qty: ${quantity}`));
    }
  };

  // General logs
  info = (message: string, data?: any) => {
    console.log(color.cyan.bold(`${this.prefix} ℹ️ INFO: ${message}`));
    if (data) console.log(color.cyan(`   Data: ${JSON.stringify(data, null, 2)}`));
  };

  warn = (message: string, data?: any) => {
    console.log(color.yellow.bold(`${this.prefix} ⚠️ WARNING: ${message}`));
    if (data) console.log(color.yellow(`   Data: ${JSON.stringify(data, null, 2)}`));
  };

  error = (message: string, error?: any) => {
    console.log(color.red.bold(`${this.prefix} ❌ ERROR: ${message}`));
    if (error) console.log(color.red(`   Error: ${JSON.stringify(error, null, 2)}`));
  };

  success = (message: string, data?: any) => {
    console.log(color.green.bold(`${this.prefix} ✅ SUCCESS: ${message}`));
    if (data) console.log(color.green(`   Data: ${JSON.stringify(data, null, 2)}`));
  };

  debug = (message: string, data?: any) => {
    console.log(color.gray.bold(`${this.prefix} 🐛 DEBUG: ${message}`));
    if (data) console.log(color.gray(`   Data: ${JSON.stringify(data, null, 2)}`));
  };
}

// Create and export a singleton instance
export const logger = new BackendLogger();

// Export individual loggers for convenience
export const { server, database, auth, api, controller, middleware, business } = logger;
