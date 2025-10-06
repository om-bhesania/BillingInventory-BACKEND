# Database Scripts

This directory contains various database management scripts for the Bliss application.

## 📁 Scripts Overview

### Core Database Operations

| Script | Description | Usage |
|--------|-------------|-------|
| `createDatabase.ts` | Creates the PostgreSQL database | `npm run db:create` |
| `seedDatabase.ts` | Seeds the database with sample data | `npm run db:seed` |
| `backupDatabase.ts` | Creates a database backup | `npm run db:backup` |
| `restoreDatabase.ts` | Restores database from backup | `npm run db:restore` |
| `setupEnvironment.ts` | Interactive environment setup | `npm run env:setup` |

### Migration Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `migrateShopIds.ts` | Migrates shop IDs in existing data | `npm run migrate:shopIds` |

## 🚀 Quick Start

### First Time Setup

```bash
# 1. Setup environment
npm run env:setup

# 2. Create database
npm run db:create

# 3. Complete database setup
npm run db:setup
```

### Daily Operations

```bash
# Start development server
npm run dev

# Open database GUI
npm run db:studio

# Create backup
npm run db:backup
```

## 📋 Script Details

### createDatabase.ts

Creates a new PostgreSQL database and optional user for the application.

**Features:**
- Checks if database already exists
- Creates dedicated application user
- Grants necessary permissions
- Provides troubleshooting guidance

**Environment Variables:**
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: InvoiceAndInventoryDB)
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password

### seedDatabase.ts

Populates the database with sample data for development and testing.

**Features:**
- Creates sample categories, flavors, and packaging types
- Sets up shops and users with proper roles
- Creates products and shop inventory
- Generates restock requests and notifications
- Creates sample billing records

**Default Users Created:**
- Admin: `admin@blissicecream.com` / `password123`
- Shop Owner 1: `john@blissicecream.com` / `password123`
- Shop Owner 2: `sarah@blissicecream.com` / `password123`

### backupDatabase.ts

Creates a complete backup of the database.

**Features:**
- Uses `pg_dump` for reliable backups
- Creates timestamped backup files
- Maintains a "latest" backup for easy access
- Shows backup history
- Provides restore instructions

**Backup Location:** `server/backups/`

### restoreDatabase.ts

Restores the database from a backup file.

**Features:**
- Lists available backups
- Confirms restore operation
- Runs post-restore tasks
- Provides troubleshooting guidance

**Usage:**
```bash
# Restore latest backup
npm run db:restore

# Restore specific backup
npm run db:restore backup_InvoiceAndInventoryDB_2024-01-15T10-30-00-000Z.sql
```

### setupEnvironment.ts

Interactive script to set up the `.env` file.

**Features:**
- Prompts for database configuration
- Generates secure JWT secrets
- Creates `.env` and `.env.example` files
- Tests database connection
- Provides next steps guidance

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:**
- Ensure PostgreSQL is running
- Check connection details in `.env`
- Verify firewall settings

#### Permission Denied
```
Error: permission denied for database
```
**Solution:**
- Grant necessary permissions to database user
- Check user roles and privileges
- Ensure user can create databases

#### Backup/Restore Failed
```
Error: pg_dump: command not found
```
**Solution:**
- Install PostgreSQL client tools
- Add PostgreSQL bin directory to PATH
- Use full path to pg_dump/psql

### Getting Help

1. Check the main `DATABASE_SETUP.md` file
2. Review script error messages
3. Check PostgreSQL logs
4. Verify environment variables
5. Test database connection manually

## 📊 Database Schema

The scripts work with the following main entities:

- **Users** - Authentication and user management
- **Roles & Permissions** - Role-based access control
- **Shops** - Store management
- **Products** - Product catalog
- **ShopInventory** - Inventory tracking
- **RestockRequest** - Restock management
- **Billing** - Invoice management
- **Notifications** - User notifications
- **AuditLog** - System audit trail

## 🔒 Security Notes

- Never commit `.env` files to version control
- Use strong, unique passwords for database users
- Rotate JWT secrets regularly
- Restrict database user permissions to minimum required
- Keep backups secure and encrypted

## 📈 Performance Tips

- Run backups during low-traffic periods
- Use `pg_dump` with compression for large databases
- Monitor database size and performance
- Regular maintenance and cleanup
- Index optimization for large datasets

---

For more information, see the main `DATABASE_SETUP.md` file in the server root directory.
