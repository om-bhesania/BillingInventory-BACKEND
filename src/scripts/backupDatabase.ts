import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function backupDatabase() {
  try {
    console.log('💾 Starting database backup...');

    const dbName = process.env.DB_NAME || 'InvoiceAndInventoryDB';
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || '';

    // Create backups directory if it doesn't exist
    const backupsDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Generate timestamp for backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${dbName}_${timestamp}.sql`;
    const backupPath = path.join(backupsDir, backupFileName);

    // Set PGPASSWORD environment variable for pg_dump
    const env = { ...process.env, PGPASSWORD: dbPassword };

    console.log(`📦 Creating backup: ${backupFileName}`);

    // Create the backup using pg_dump
    const pgDumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-password --verbose --clean --if-exists --create --format=plain > "${backupPath}"`;
    
    execSync(pgDumpCommand, { 
      env,
      stdio: 'inherit',
      shell: '/bin/bash'
    });

    // Get file size
    const stats = fs.statSync(backupPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Backup created successfully!`);
    console.log(`📁 Location: ${backupPath}`);
    console.log(`📊 Size: ${fileSizeInMB} MB`);

    // Create a latest backup symlink/copy for easy access
    const latestBackupPath = path.join(backupsDir, `latest_${dbName}.sql`);
    fs.copyFileSync(backupPath, latestBackupPath);
    console.log(`🔗 Latest backup: ${latestBackupPath}`);

    // List recent backups
    console.log('\n📋 Recent backups:');
    const backupFiles = fs.readdirSync(backupsDir)
      .filter(file => file.startsWith(`backup_${dbName}_`))
      .sort()
      .reverse()
      .slice(0, 5);

    backupFiles.forEach((file, index) => {
      const filePath = path.join(backupsDir, file);
      const fileStats = fs.statSync(filePath);
      const size = (fileStats.size / (1024 * 1024)).toFixed(2);
      const date = fileStats.mtime.toLocaleString();
      console.log(`  ${index + 1}. ${file} (${size} MB) - ${date}`);
    });

    console.log('\n💡 To restore this backup, run:');
    console.log(`   npm run db:restore -- ${backupFileName}`);

  } catch (error: any) {
    console.error('❌ Error creating backup:', error.message);
    
    if (error.message.includes('pg_dump')) {
      console.log('\n💡 Troubleshooting:');
      console.log('- Make sure PostgreSQL is running');
      console.log('- Check your database credentials in .env file');
      console.log('- Ensure pg_dump is installed and in your PATH');
      console.log('- Verify the database exists and is accessible');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backup
backupDatabase()
  .then(() => {
    console.log('🎉 Backup process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Backup process failed:', error.message);
    process.exit(1);
  });
