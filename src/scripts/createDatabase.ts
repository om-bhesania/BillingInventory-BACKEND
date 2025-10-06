import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function createDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: 'postgres', // Connect to default postgres database
  });

  try {
    console.log('🔗 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    const dbName = process.env.DB_NAME || 'InvoiceAndInventoryDB';
    
    // Check if database already exists
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (result.rows.length > 0) {
      console.log(`⚠️  Database '${dbName}' already exists.`);
      console.log('   If you want to recreate it, please drop it manually first.');
      return;
    }

    // Create the database
    console.log(`🏗️  Creating database '${dbName}'...`);
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✅ Database '${dbName}' created successfully!`);

    // Create a dedicated user for the application (optional)
    const appUser = process.env.DB_USER || 'bliss_user';
    const appPassword = process.env.DB_PASSWORD || 'bliss_password';
    
    try {
      console.log(`👤 Creating application user '${appUser}'...`);
      await client.query(`CREATE USER "${appUser}" WITH PASSWORD '${appPassword}'`);
      await client.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${appUser}"`);
      console.log(`✅ User '${appUser}' created and granted privileges`);
    } catch (userError: any) {
      if (userError.code === '42710') {
        console.log(`⚠️  User '${appUser}' already exists. Skipping user creation.`);
      } else {
        console.log(`⚠️  Could not create user '${appUser}':`, userError.message);
        console.log('   You may need to create the user manually or use an existing user.');
      }
    }

    console.log('\n🎉 Database setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm run generate');
    console.log('2. Run: npm run migrate');
    console.log('3. Run: npm run role');
    console.log('4. Run: npm run db:seed (optional)');

  } catch (error: any) {
    console.error('❌ Error creating database:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:');
      console.log('- Make sure PostgreSQL is running');
      console.log('- Check your connection details in .env file');
      console.log('- Verify the host, port, and credentials');
    } else if (error.code === '28P01') {
      console.log('\n💡 Troubleshooting:');
      console.log('- Check your database credentials in .env file');
      console.log('- Make sure the user has permission to create databases');
    }
    
    throw error;
  } finally {
    await client.end();
  }
}

// Run the database creation
createDatabase()
  .then(() => {
    console.log('✅ Database creation process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database creation failed:', error.message);
    process.exit(1);
  });
