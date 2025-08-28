"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateShopIds = migrateShopIds;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
async function migrateShopIds() {
    try {
        logger_1.logger.info("Starting shopIds migration...");
        // First, fix any null shopIds values by setting them to empty arrays
        logger_1.logger.info("Fixing null shopIds values...");
        const nullFixResult = await prisma.$executeRaw `
      UPDATE "User" 
      SET "shopIds" = '{}'::text[] 
      WHERE "shopIds" IS NULL
    `;
        logger_1.logger.info(`Fixed ${nullFixResult} users with null shopIds`);
        // Now get all users (shopIds should no longer be null)
        const users = await prisma.user.findMany({
            select: {
                id: true,
                publicId: true,
                shopIds: true
            }
        });
        logger_1.logger.info(`Found ${users.length} users to migrate`);
        for (const user of users) {
            try {
                // Get shops where this user is the manager
                const managedShops = await prisma.shop.findMany({
                    where: { managerId: user.publicId },
                    select: { id: true }
                });
                if (managedShops.length > 0) {
                    const shopIds = managedShops.map(shop => shop.id);
                    // Update user's shopIds array
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { shopIds }
                    });
                    logger_1.logger.info(`Updated user ${user.publicId} with shop IDs: ${shopIds.join(', ')}`);
                }
                else {
                    // Set empty array for users with no shops
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { shopIds: [] }
                    });
                    logger_1.logger.info(`Updated user ${user.publicId} with empty shopIds array`);
                }
            }
            catch (error) {
                logger_1.logger.error(`Failed to migrate user ${user.publicId}:`, error);
            }
        }
        logger_1.logger.info("ShopIds migration completed successfully!");
    }
    catch (error) {
        logger_1.logger.error("Migration failed:", error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run migration if this script is executed directly
if (require.main === module) {
    migrateShopIds();
}
