# Database Setup Guide for Bliss

This guide will help you set up the database for the Bliss application on any new device or environment.

## 📋 Prerequisites

Before setting up the database, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **PostgreSQL** (v13 or higher)
- **npm** or **yarn** package manager

## 🗄️ Database Requirements

- **Database Type**: PostgreSQL
- **Database Name**: `InvoiceAndInventoryDB` (or your preferred name)
- **Port**: 5432 (default PostgreSQL port)
- **User**: Create a dedicated user with appropriate permissions

## 🚀 Quick Setup (Recommended)

### Step 1: Clone and Install Dependencies

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install
```

### Step 2: Environment Setup

```bash
# Run the environment setup script
npm run env:setup
```

This will create a `.env` file with the required environment variables. You'll need to update the database credentials.

### Step 3: Database Setup

```bash
# Complete database setup (creates DB, runs migrations, seeds data)
npm run db:setup
```

That's it! Your database should now be ready.

## 🔧 Manual Setup (Step by Step)

If you prefer to set up manually or need to troubleshoot:

### Step 1: Create Database

```bash
# Create the database
npm run db:create
```

### Step 2: Environment Configuration

Create a `.env` file in the `server` directory with the following content:

```env
# Database Configuration
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
```

**Important**: Replace the placeholder values with your actual database credentials.

### Step 3: Generate Prisma Client

```bash
npm run generate
```

### Step 4: Run Migrations

```bash
# For development
npm run migrate

# For production
npm run db:deploy
```

### Step 5: Setup Roles and Permissions

```bash
npm run role
```

### Step 6: Seed Database (Optional)

```bash
npm run db:seed
```

## 📜 Available Database Scripts

### Core Database Operations

| Command | Description |
|---------|-------------|
| `npm run db:setup` | Complete database setup (generate + migrate + roles + seed) |
| `npm run db:reset` | Reset database and re-run all setup steps |
| `npm run db:deploy` | Deploy migrations to production |
| `npm run db:status` | Check migration status |

### Development Tools

| Command | Description |
|---------|-------------|
| `npm run migrate` | Create and apply new migration |
| `npm run generate` | Generate Prisma client |
| `npm run push` | Push schema changes without migration |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

### Database Management

| Command | Description |
|---------|-------------|
| `npm run db:backup` | Create database backup |
| `npm run db:restore` | Restore database from backup |
| `npm run db:create` | Create database if it doesn't exist |
| `npm run db:seed` | Seed database with sample data |

### Schema Management

| Command | Description |
|---------|-------------|
| `npm run db:format` | Format Prisma schema |
| `npm run db:validate` | Validate Prisma schema |
| `npm run db:diff` | Show differences between schema and database |

### Environment Setup

| Command | Description |
|---------|-------------|
| `npm run env:setup` | Interactive environment setup |
| `npm run setup` | Legacy setup script |

## 🗃️ Database Schema Overview

The database includes the following main entities:

- **Users**: Authentication and user management
- **Roles & Permissions**: Role-based access control
- **Shops**: Store management
- **Products**: Product catalog with categories and flavors
- **ShopInventory**: Inventory tracking per shop
- **RestockRequest**: Restock request management
- **Billing**: Invoice and billing management
- **Notifications**: User notifications
- **AuditLog**: System audit trail

## 🔐 Default Roles and Permissions

### Admin Role
- Full system access
- Can manage all shops, users, and products
- Access to all modules and actions

### Shop_Owner Role
- Limited to their assigned shops
- Can manage shop inventory and billing
- Restricted access to user management

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Ensure PostgreSQL is running and the connection details in `.env` are correct.

#### 2. Migration Failed
```
Error: Migration failed
```
**Solution**: 
```bash
# Check migration status
npm run db:status

# Reset and try again
npm run db:reset
```

#### 3. Permission Denied
```
Error: permission denied for database
```
**Solution**: Ensure your database user has the necessary permissions:
```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE InvoiceAndInventoryDB TO your_username;
GRANT ALL ON SCHEMA public TO your_username;
```

#### 4. Prisma Client Not Generated
```
Error: PrismaClient is not defined
```
**Solution**:
```bash
npm run generate
```

### Reset Everything

If you need to start completely fresh:

```bash
# Stop the application
# Drop the database manually in PostgreSQL
# Then run:
npm run db:setup
```

## 🔄 Development Workflow

### Making Schema Changes

1. **Edit the schema**: Modify `prisma/schema.prisma`
2. **Create migration**: `npm run migrate`
3. **Test changes**: `npm run db:studio`
4. **Deploy**: `npm run db:deploy` (for production)

### Adding New Data

1. **Create seed script**: Add to `src/scripts/`
2. **Update package.json**: Add new script
3. **Run seed**: `npm run db:seed`

## 📊 Database Monitoring

### Check Database Status
```bash
npm run db:status
```

### Open Database GUI
```bash
npm run db:studio
```

### View Database Logs
Check your PostgreSQL logs for detailed error information.

## 🚀 Production Deployment

### Pre-deployment Checklist

- [ ] Database credentials are secure
- [ ] JWT secrets are strong and unique
- [ ] All migrations are applied
- [ ] Roles and permissions are set up
- [ ] Database is backed up

### Production Commands

```bash
# Deploy migrations
npm run db:deploy

# Generate Prisma client
npm run generate

# Start application
npm run start
```

## 📞 Support

If you encounter issues not covered in this guide:

1. Check the troubleshooting section above
2. Review PostgreSQL logs
3. Check Prisma documentation: https://www.prisma.io/docs/
4. Create an issue in the project repository

## 🔗 Useful Links

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)

---

**Happy Coding! 🎉**

For any questions or issues, please refer to the troubleshooting section or create an issue in the repository.
