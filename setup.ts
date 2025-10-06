import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const envPath = path.join(__dirname, './.env');

console.log('--- Bliss Backend Setup ---');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('Please create a .env file in the server directory with the following content:');
  console.log(`\nDATABASE_URL="postgresql://DB_USER:DB_PASSWORD@DB_HOST:DB_PORT/DB_NAME"\nDB_HOST=your_host\nDB_PORT=5432\nDB_NAME=InvoiceAndInventoryDB\nDB_USER=your_user\nDB_PASSWORD=your_password\nDB_DRIVER=postgresql\nJWT_SECRET=your_jwt_secret\nJWT_REFRESH_SECRET=your_jwt_refresh_secret\n`);
  process.exit(1);
} else {
  console.log('✅ .env file found.');
}

try {
  console.log('🔄 Running: npx prisma generate');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated.');

  console.log('🔄 Running: npx prisma db push');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Database schema synced.');

  console.log('🔄 Setting up roles and permissions...');
  execSync('npx ts-node setupRoles.ts', { stdio: 'inherit' });
  console.log('✅ Roles and permissions created.');

  console.log('🔄 Seeding database with default data...');
  execSync('npx ts-node src/scripts/seedDatabase.ts', { stdio: 'inherit' });
  console.log('✅ Database seeded with default admin user.');

  console.log('🎉 Setup complete! You can now start the backend with:');
  console.log('   npm run dev');
  console.log('\n🔑 Default Admin Login:');
  console.log('   Email: bhesaniaom@gmail.com');
  console.log('   Password: Password@123');
} catch (err) {
  console.error('❌ Error during setup:', err);
  process.exit(1);
}
