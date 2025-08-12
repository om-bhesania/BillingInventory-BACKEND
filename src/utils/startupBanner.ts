import { color } from 'console-log-colors';

export const printStartupBanner = () => {
  console.log('\n');
  console.log(color.cyan.bold('╔══════════════════════════════════════════════════════════════╗'));
  console.log(color.cyan.bold('║                                                              ║'));
  console.log(color.cyan.bold('║') + color.white.bold('  🍦 Bliss Ice Cream Management System 🍦') + color.cyan.bold('                    ║'));
  console.log(color.cyan.bold('║') + color.gray('  Multi-shop inventory and billing management') + color.cyan.bold('        ║'));
  console.log(color.cyan.bold('║') + color.gray('  Built with Node.js, Express, Prisma & React') + color.cyan.bold('        ║'));
  console.log(color.cyan.bold('║                                                              ║'));
  console.log(color.cyan.bold('╠══════════════════════════════════════════════════════════════╣'));
  console.log(color.cyan.bold('║') + color.yellow('  🔐 Authentication: JWT with Refresh Tokens') + color.cyan.bold('              ║'));
  console.log(color.cyan.bold('║') + color.yellow('  🛡️  Authorization: Role-Based Access Control') + color.cyan.bold('            ║'));
  console.log(color.cyan.bold('║') + color.yellow('  🗄️  Database: PostgreSQL with Prisma ORM') + color.cyan.bold('              ║'));
  console.log(color.cyan.bold('║') + color.yellow('  📊 API: RESTful with Swagger Documentation') + color.cyan.bold('              ║'));
  console.log(color.cyan.bold('║') + color.yellow('  🌐 CORS: Configured for Frontend Integration') + color.cyan.bold('              ║'));
  console.log(color.cyan.bold('║                                                              ║'));
  console.log(color.cyan.bold('╠══════════════════════════════════════════════════════════════╣'));
  console.log(color.cyan.bold('║') + color.green('  👥 Roles: Admin (Full Access) | Shop Owner (Limited)') + color.cyan.bold('        ║'));
  console.log(color.cyan.bold('║') + color.green('  🏪 Features: Shop Management, Inventory, Invoicing') + color.cyan.bold('        ║'));
  console.log(color.cyan.bold('║') + color.green('  📈 Business: Multi-shop support with role isolation') + color.cyan.bold('        ║'));
  console.log(color.cyan.bold('║                                                              ║'));
  console.log(color.cyan.bold('╚══════════════════════════════════════════════════════════════╝'));
  console.log('\n');
};

export const printEnvironmentInfo = (port: number, env: string) => {
  console.log(color.blue.bold('📋 Environment Information:'));
  console.log(color.blue(`   Port: ${port}`));
  console.log(color.blue(`   Environment: ${env}`));
  console.log(color.blue(`   Node Version: ${process.version}`));
  console.log(color.blue(`   Platform: ${process.platform}`));
  console.log(color.blue(`   Architecture: ${process.arch}`));
  console.log('\n');
};

export const printRoutesInfo = (port: number) => {
  console.log(color.magenta.bold('🔗 Available Endpoints:'));
  console.log(color.magenta(`   🏠 Health Check: http://localhost:${port}/health`));
  console.log(color.magenta(`   📚 API Docs: http://localhost:${port}/api-docs`));
  console.log(color.magenta(`   🔐 Auth: http://localhost:${port}/api/auth`));
  console.log(color.magenta(`   🏪 Shops: http://localhost:${port}/api/shops`));
  console.log(color.magenta(`   👥 Users: http://localhost:${port}/api/auth/users`));
  console.log(color.magenta(`   📦 Inventory: http://localhost:${port}/api/inventory`));
  console.log(color.magenta(`   🧾 Invoices: http://localhost:${port}/api/invoices`));
  console.log('\n');
};
