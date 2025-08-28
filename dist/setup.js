"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const envPath = path_1.default.join(__dirname, './.env');
console.log('--- Bliss Backend Setup ---');
if (!fs_1.default.existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('Please create a .env file in the server directory with the following content:');
    console.log(`\nDATABASE_URL="postgresql://DB_USER:DB_PASSWORD@DB_HOST:DB_PORT/DB_NAME"\nDB_HOST=your_host\nDB_PORT=5432\nDB_NAME=InvoiceAndInventoryDB\nDB_USER=your_user\nDB_PASSWORD=your_password\nDB_DRIVER=postgresql\nJWT_SECRET=your_jwt_secret\nJWT_REFRESH_SECRET=your_jwt_refresh_secret\n`);
    process.exit(1);
}
else {
    console.log('✅ .env file found.');
}
try {
    console.log('🔄 Running: npx prisma generate');
    (0, child_process_1.execSync)('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated.');
    console.log('🔄 Running: npx prisma migrate deploy');
    (0, child_process_1.execSync)('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Prisma migrations deployed.');
    console.log('🎉 Setup complete! You can now start the backend with:');
    console.log('   npm run dev');
}
catch (err) {
    console.error('❌ Error during setup:', err);
    process.exit(1);
}
