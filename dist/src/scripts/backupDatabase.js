"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const prisma = new client_1.PrismaClient();
async function backupDatabase() {
    try {
        console.log('💾 Starting database backup...');
        const dbName = process.env.DB_NAME || 'InvoiceAndInventoryDB';
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || '5432';
        const dbUser = process.env.DB_USER || 'postgres';
        const dbPassword = process.env.DB_PASSWORD || '';
        // Create backups directory if it doesn't exist
        const backupsDir = path_1.default.join(__dirname, '../../backups');
        if (!fs_1.default.existsSync(backupsDir)) {
            fs_1.default.mkdirSync(backupsDir, { recursive: true });
        }
        // Generate timestamp for backup filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `backup_${dbName}_${timestamp}.sql`;
        const backupPath = path_1.default.join(backupsDir, backupFileName);
        // Set PGPASSWORD environment variable for pg_dump
        const env = { ...process.env, PGPASSWORD: dbPassword };
        console.log(`📦 Creating backup: ${backupFileName}`);
        // Create the backup using pg_dump
        const pgDumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-password --verbose --clean --if-exists --create --format=plain > "${backupPath}"`;
        (0, child_process_1.execSync)(pgDumpCommand, {
            env,
            stdio: 'inherit',
            shell: '/bin/bash'
        });
        // Get file size
        const stats = fs_1.default.statSync(backupPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`✅ Backup created successfully!`);
        console.log(`📁 Location: ${backupPath}`);
        console.log(`📊 Size: ${fileSizeInMB} MB`);
        // Create a latest backup symlink/copy for easy access
        const latestBackupPath = path_1.default.join(backupsDir, `latest_${dbName}.sql`);
        fs_1.default.copyFileSync(backupPath, latestBackupPath);
        console.log(`🔗 Latest backup: ${latestBackupPath}`);
        // List recent backups
        console.log('\n📋 Recent backups:');
        const backupFiles = fs_1.default.readdirSync(backupsDir)
            .filter(file => file.startsWith(`backup_${dbName}_`))
            .sort()
            .reverse()
            .slice(0, 5);
        backupFiles.forEach((file, index) => {
            const filePath = path_1.default.join(backupsDir, file);
            const fileStats = fs_1.default.statSync(filePath);
            const size = (fileStats.size / (1024 * 1024)).toFixed(2);
            const date = fileStats.mtime.toLocaleString();
            console.log(`  ${index + 1}. ${file} (${size} MB) - ${date}`);
        });
        console.log('\n💡 To restore this backup, run:');
        console.log(`   npm run db:restore -- ${backupFileName}`);
    }
    catch (error) {
        console.error('❌ Error creating backup:', error.message);
        if (error.message.includes('pg_dump')) {
            console.log('\n💡 Troubleshooting:');
            console.log('- Make sure PostgreSQL is running');
            console.log('- Check your database credentials in .env file');
            console.log('- Ensure pg_dump is installed and in your PATH');
            console.log('- Verify the database exists and is accessible');
        }
        throw error;
    }
    finally {
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
