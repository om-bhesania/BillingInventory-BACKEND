# 🚀 Bliss Quick Start Guide

This guide will get you up and running with the Bliss application in minutes!

## ⚡ Super Quick Setup (3 Commands)

```bash
# 1. Install dependencies
npm install

# 2. Setup environment and database
npm run env:setup

# 3. Complete database setup
npm run db:setup
```

That's it! Your database is ready. Start the server with `npm run dev`.

## 📋 What Just Happened?

The `npm run db:setup` command:
1. ✅ Generated Prisma client
2. ✅ Created and ran database migrations
3. ✅ Set up roles and permissions
4. ✅ Seeded database with sample data

## 🔑 Default Login Credentials

- **Admin**: `admin@blissicecream.com` / `password123`
- **Shop Owner 1**: `john@blissicecream.com` / `password123`
- **Shop Owner 2**: `sarah@blissicecream.com` / `password123`

## 🛠️ Available Commands

### Database Management
```bash
npm run db:setup      # Complete database setup
npm run db:reset      # Reset database and re-setup
npm run db:backup     # Create database backup
npm run db:restore    # Restore from backup
npm run db:studio     # Open database GUI
```

### Development
```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
```

### Environment
```bash
npm run env:setup     # Interactive environment setup
```

## 🗄️ Database Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run db:create` | Create PostgreSQL database |
| `npm run db:setup` | Complete setup (generate + migrate + roles + seed) |
| `npm run db:reset` | Reset everything and start fresh |
| `npm run db:deploy` | Deploy migrations to production |
| `npm run db:status` | Check migration status |
| `npm run db:seed` | Seed with sample data |
| `npm run db:backup` | Create database backup |
| `npm run db:restore` | Restore from backup |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:format` | Format Prisma schema |
| `npm run db:validate` | Validate Prisma schema |
| `npm run db:diff` | Show schema differences |

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Test connection
npm run db:status

# Reset everything
npm run db:reset
```

### Environment Issues
```bash
# Re-setup environment
npm run env:setup
```

### Permission Issues
Make sure your database user has these permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE InvoiceAndInventoryDB TO your_username;
GRANT ALL ON SCHEMA public TO your_username;
```

## 📚 More Information

- **Full Database Setup**: See `DATABASE_SETUP.md`
- **Scripts Documentation**: See `src/scripts/README.md`
- **API Documentation**: Available at `http://localhost:3001/api-docs` (when running)

## 🎉 You're Ready!

Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3001` to see your API running!

---

**Need Help?** Check the troubleshooting section or refer to the detailed documentation files.
