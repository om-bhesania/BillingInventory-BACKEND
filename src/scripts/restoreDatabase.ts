import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function restoreDatabase() {
  try {
    console.log('🔄 Starting database restore...');

    const dbName = process.env.DB_NAME || 'InvoiceAndInventoryDB';
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || '';

    // Get backup file from command line argument or use latest
    const backupFileName = process.argv[2] || `latest_${dbName}.sql`;
    const backupsDir = path.join(__dirname, '../../backups');
    const backupPath = path.join(backupsDir, backupFileName);

    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      console.error(`❌ Backup file not found: ${backupPath}`);
      console.log('\n📋 Available backups:');
      
      if (fs.existsSync(backupsDir)) {
        const backupFiles = fs.readdirSync(backupsDir)
          .filter(file => file.endsWith('.sql'))
          .sort()
          .reverse();
        
        if (backupFiles.length === 0) {
          console.log('   No backup files found in backups directory');
        } else {
          backupFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file}`);
          });
        }
      } else {
        console.log('   Backups directory does not exist');
      }
      
      console.log('\n💡 Usage:');
      console.log('   npm run db:restore [backup-filename]');
      console.log('   npm run db:restore backup_InvoiceAndInventoryDB_2024-01-15T10-30-00-000Z.sql');
      
      process.exit(1);
    }

    // Get backup file info
    const stats = fs.statSync(backupPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    const lastModified = stats.mtime.toLocaleString();

    console.log(`📦 Restoring from: ${backupFileName}`);
    console.log(`📊 Size: ${fileSizeInMB} MB`);
    console.log(`📅 Modified: ${lastModified}`);

    // Confirm restore operation
    console.log('\n⚠️  WARNING: This will completely replace the current database!');
    console.log('   All existing data will be lost.');
    console.log('   Make sure you have a current backup if needed.');
    
    // In a real application, you might want to add a confirmation prompt here
    // For now, we'll proceed with the restore

    // Set PGPASSWORD environment variable for psql
    const env = { ...process.env, PGPASSWORD: dbPassword };

    console.log('\n🔄 Restoring database...');

    // Restore the database using psql
    const psqlCommand = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -f "${backupPath}"`;
    
    execSync(psqlCommand, { 
      env,
      stdio: 'inherit',
      shell: '/bin/bash'
    });

    console.log('✅ Database restored successfully!');

    // Run post-restore tasks
    console.log('\n🔧 Running post-restore tasks...');
    
    try {
      console.log('   - Generating Prisma client...');
      execSync('npx prisma generate', { stdio: 'inherit' });
      
      console.log('   - Verifying database connection...');
      execSync('npx prisma db pull', { stdio: 'inherit' });
      
      console.log('✅ Post-restore tasks completed!');
    } catch (postRestoreError) {
      console.log('⚠️  Post-restore tasks had some issues, but restore was successful');
      console.log('   You may need to run "npm run generate" manually');
    }

    console.log('\n🎉 Database restore completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify the data: npm run db:studio');
    console.log('2. Run the application: npm run dev');

  } catch (error: any) {
    console.error('❌ Error restoring database:', error.message);
    
    if (error.message.includes('psql')) {
      console.log('\n💡 Troubleshooting:');
      console.log('- Make sure PostgreSQL is running');
      console.log('- Check your database credentials in .env file');
      console.log('- Ensure psql is installed and in your PATH');
      console.log('- Verify the backup file is not corrupted');
      console.log('- Make sure the target database exists or can be created');
    }
    
    throw error;
  }
}

// Run the restore
restoreDatabase()
  .then(() => {
    console.log('✅ Restore process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Restore process failed:', error.message);
    process.exit(1);
  });
