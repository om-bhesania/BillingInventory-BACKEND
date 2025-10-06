import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEnvironment() {
  try {
    console.log('🔧 Bliss Environment Setup');
    console.log('========================\n');

    const envPath = path.join(__dirname, '../../.env');
    
    // Check if .env already exists
    if (fs.existsSync(envPath)) {
      const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('❌ Setup cancelled. Existing .env file preserved.');
        process.exit(0);
      }
    }

    console.log('📝 Please provide the following information:\n');

    // Database configuration
    console.log('🗄️  Database Configuration:');
    const dbHost = await question('Database Host (localhost): ') || 'localhost';
    const dbPort = await question('Database Port (5432): ') || '5432';
    const dbName = await question('Database Name (InvoiceAndInventoryDB): ') || 'InvoiceAndInventoryDB';
    const dbUser = await question('Database User (postgres): ') || 'postgres';
    const dbPassword = await question('Database Password: ');

    if (!dbPassword) {
      console.log('❌ Database password is required!');
      process.exit(1);
    }

    // JWT configuration
    console.log('\n🔐 JWT Configuration:');
    const jwtSecret = await question('JWT Secret (press Enter for auto-generated): ');
    const jwtRefreshSecret = await question('JWT Refresh Secret (press Enter for auto-generated): ');

    // Generate secrets if not provided
    const finalJwtSecret = jwtSecret || generateRandomSecret();
    const finalJwtRefreshSecret = jwtRefreshSecret || generateRandomSecret();

    // Server configuration
    console.log('\n🌐 Server Configuration:');
    const port = await question('Server Port (3001): ') || '3001';
    const nodeEnv = await question('Node Environment (development): ') || 'development';

    // Create .env content
    const envContent = `# Database Configuration
DATABASE_URL="postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}"
DIRECT_URL="postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}"

# Database Connection Details (for scripts)
DB_HOST=${dbHost}
DB_PORT=${dbPort}
DB_NAME=${dbName}
DB_USER=${dbUser}
DB_PASSWORD=${dbPassword}
DB_DRIVER=postgresql

# JWT Configuration
JWT_SECRET=${finalJwtSecret}
JWT_REFRESH_SECRET=${finalJwtRefreshSecret}

# Server Configuration
PORT=${port}
NODE_ENV=${nodeEnv}

# Optional: CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Optional: Logging
LOG_LEVEL=info
`;

    // Write .env file
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file created successfully!');

    // Create .env.example file
    const envExamplePath = path.join(__dirname, '../../.env.example');
    const envExampleContent = `# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/InvoiceAndInventoryDB"
DIRECT_URL="postgresql://username:password@localhost:5432/InvoiceAndInventoryDB"

# Database Connection Details (for scripts)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=InvoiceAndInventoryDB
DB_USER=your_username
DB_PASSWORD=your_password
DB_DRIVER=postgresql

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Optional: CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Optional: Logging
LOG_LEVEL=info
`;

    fs.writeFileSync(envExamplePath, envExampleContent);
    console.log('✅ .env.example file created successfully!');

    // Display next steps
    console.log('\n🎉 Environment setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Create the database: npm run db:create');
    console.log('2. Setup the database: npm run db:setup');
    console.log('3. Start the development server: npm run dev');

    // Test database connection
    const testConnection = await question('\n🔍 Test database connection now? (Y/n): ');
    if (testConnection.toLowerCase() !== 'n' && testConnection.toLowerCase() !== 'no') {
      console.log('\n🔗 Testing database connection...');
      try {
        const { execSync } = require('child_process');
        execSync('npx prisma db pull', { stdio: 'inherit' });
        console.log('✅ Database connection successful!');
      } catch (error) {
        console.log('⚠️  Database connection failed. Please check your credentials.');
        console.log('   You can test the connection later with: npm run db:status');
      }
    }

  } catch (error) {
    console.error('❌ Error during environment setup:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

function generateRandomSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Run the setup
setupEnvironment()
  .then(() => {
    console.log('\n🎉 Environment setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Environment setup failed:', error);
    process.exit(1);
  });
