"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function cleanupOrphanedData() {
    try {
        console.log('🧹 Starting orphaned data cleanup...');
        // 1. Find users that no longer exist but have related data
        const orphanedShops = await prisma.shop.findMany({
            where: {
                managerId: {
                    not: null,
                },
                manager: null, // This will find shops with managerId that doesn't exist
            },
            include: {
                inventory: true,
                restockRequests: true,
                billings: true,
            },
        });
        console.log(`Found ${orphanedShops.length} shops with orphaned managers`);
        // 2. Clean up orphaned shop data
        for (const shop of orphanedShops) {
            console.log(`Cleaning up shop: ${shop.name} (ID: ${shop.id})`);
            // Option 1: Soft delete the shop and related data
            await prisma.shop.update({
                where: { id: shop.id },
                data: {
                    isActive: false,
                    managerId: null,
                },
            });
            // Soft delete related inventory
            await prisma.shopInventory.updateMany({
                where: { shopId: shop.id },
                data: { isActive: false },
            });
            // Soft delete related restock requests
            await prisma.restockRequest.updateMany({
                where: { shopId: shop.id },
                data: { hidden: true },
            });
            console.log(`✅ Cleaned up shop: ${shop.name}`);
        }
        // 3. Find orphaned notifications
        // First, get all notification user IDs
        const allNotificationUserIds = await prisma.notification.findMany({
            select: { userId: true },
            distinct: ['userId'],
        });
        // Check which user IDs don't exist
        const existingUserIds = await prisma.user.findMany({
            where: {
                publicId: {
                    in: allNotificationUserIds.map(n => n.userId),
                },
            },
            select: { publicId: true },
        });
        const existingUserIdSet = new Set(existingUserIds.map(u => u.publicId));
        const orphanedUserIds = allNotificationUserIds
            .map(n => n.userId)
            .filter(userId => !existingUserIdSet.has(userId));
        console.log(`Found ${orphanedUserIds.length} orphaned notification user IDs`);
        // Soft delete orphaned notifications
        if (orphanedUserIds.length > 0) {
            await prisma.notification.updateMany({
                where: {
                    userId: { in: orphanedUserIds },
                },
                data: { hidden: true },
            });
            console.log(`✅ Cleaned up notifications for ${orphanedUserIds.length} orphaned users`);
        }
        // 4. Find orphaned audit logs
        // Get all audit log user IDs that are not null
        const auditLogUserIds = await prisma.auditLog.findMany({
            where: {
                userId: {
                    not: null,
                },
            },
            select: { userId: true },
            distinct: ['userId'],
        });
        // Check which audit log user IDs don't exist
        const validAuditUserIds = auditLogUserIds
            .map(a => a.userId)
            .filter((userId) => userId !== null);
        const existingAuditUserIds = await prisma.user.findMany({
            where: {
                publicId: {
                    in: validAuditUserIds,
                },
            },
            select: { publicId: true },
        });
        const existingAuditUserIdSet = new Set(existingAuditUserIds.map(u => u.publicId));
        const orphanedAuditUserIds = auditLogUserIds
            .map(a => a.userId)
            .filter(userId => userId && !existingAuditUserIdSet.has(userId));
        console.log(`Found ${orphanedAuditUserIds.length} orphaned audit log user IDs`);
        // Note: Audit logs are typically not deleted as they serve as historical records
        // But we can log them for manual review
        if (orphanedAuditUserIds.length > 0) {
            console.log(`⚠️  Orphaned audit log user IDs: ${orphanedAuditUserIds.join(', ')}`);
            console.log(`   These audit logs reference non-existent users but are preserved for historical records.`);
        }
        // 5. Find products that are not in any shop inventory
        const allProducts = await prisma.product.findMany({
            where: { isActive: true },
            include: {
                shopInventory: {
                    where: { isActive: true },
                },
            },
        });
        const orphanedProducts = allProducts.filter(product => product.shopInventory.length === 0);
        console.log(`Found ${orphanedProducts.length} products not in any shop inventory`);
        // Optionally soft delete orphaned products (be careful with this)
        // Uncomment the following lines if you want to auto-clean orphaned products
        /*
        if (orphanedProducts.length > 0) {
          const orphanedProductIds = orphanedProducts.map(p => p.id);
          await prisma.product.updateMany({
            where: { id: { in: orphanedProductIds } },
            data: { isActive: false },
          });
          console.log(`✅ Soft deleted ${orphanedProducts.length} orphaned products`);
        }
        */
        // 6. Summary
        console.log('\n📊 Cleanup Summary:');
        console.log(`- Orphaned shops cleaned: ${orphanedShops.length}`);
        console.log(`- Orphaned notifications cleaned: ${orphanedUserIds.length}`);
        console.log(`- Orphaned products found: ${orphanedProducts.length} (not auto-deleted)`);
        console.log(`- Orphaned audit log user IDs found: ${orphanedAuditUserIds.length} (preserved for historical records)`);
        console.log('\n✅ Orphaned data cleanup completed!');
    }
    catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the cleanup
cleanupOrphanedData()
    .then(() => {
    console.log('🎉 Cleanup process completed!');
    process.exit(0);
})
    .catch((error) => {
    console.error('💥 Cleanup process failed:', error);
    process.exit(1);
});
