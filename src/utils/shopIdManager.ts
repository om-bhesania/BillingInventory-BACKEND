import { prisma } from "../config/client";
import { logger } from "./logger";

/**
 * Add a shop ID to a user's managed shops
 * @param userPublicId - The user's public ID
 * @param shopId - The shop ID to add
 */
export const addShopIdToUser = async (userPublicId: string, shopId: string): Promise<void> => {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { publicId: userPublicId },
      select: { id: true }
    });

    if (!user) {
      logger.error(`User not found with publicId: ${userPublicId}`);
      return;
    }

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, managerId: true }
    });

    if (!shop) {
      logger.error(`Shop not found with id: ${shopId}`);
      return;
    }

    // Check if shop is already managed by this user
    if (shop.managerId === userPublicId) {
      logger.info(`Shop ID ${shopId} is already managed by user ${userPublicId}`);
      return;
    }

    // Update shop to set this user as manager
    await prisma.shop.update({
      where: { id: shopId },
      data: { managerId: userPublicId }
    });

    logger.info(`Added shop ID ${shopId} to user ${userPublicId} as manager`);
    
    // Note: shopIds array will be updated when database schema is updated
    // For now, the relationship is maintained via Shop.managerId field
  } catch (error) {
    logger.error(`Error adding shop ID ${shopId} to user ${userPublicId}:`, error);
    throw error;
  }
};

/**
 * Remove a shop ID from a user's managed shops (temporary implementation)
 * @param userPublicId - The user's public ID
 * @param shopId - The shop ID to remove
 */
export const removeShopIdFromUser = async (userPublicId: string, shopId: string): Promise<void> => {
  try {
    // Check if shop exists and is managed by this user
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, managerId: true }
    });

    if (!shop) {
      logger.error(`Shop not found with id: ${shopId}`);
      return;
    }

    if (shop.managerId !== userPublicId) {
      logger.info(`Shop ID ${shopId} is not managed by user ${userPublicId}`);
      return;
    }

    // Remove manager from shop
    await prisma.shop.update({
      where: { id: shopId },
      data: { managerId: null }
    });

    logger.info(`Removed shop ID ${shopId} from user ${userPublicId}`);
  } catch (error) {
    logger.error(`Error removing shop ID ${shopId} from user ${userPublicId}:`, error);
    throw error;
  }
};

/**
 * Get all shop IDs for a user (temporary implementation)
 * @param userPublicId - The user's public ID
 * @returns Array of shop IDs
 */
export const getUserShopIds = async (userPublicId: string): Promise<string[]> => {
  try {
    // Get shops where this user is the manager
    const managedShops = await prisma.shop.findMany({
      where: { managerId: userPublicId },
      select: { id: true }
    });

    return managedShops.map(shop => shop.id);
  } catch (error) {
    logger.error(`Error getting shop IDs for user ${userPublicId}:`, error);
    return [];
  }
};

/**
 * NOTE: This is a temporary implementation that will be replaced after:
 * 1. Database schema is updated with npx prisma db push
 * 2. Prisma client is regenerated with npx prisma generate
 * 3. The shopIds column is populated with existing data
 * 
 * Once those steps are completed, this file can be updated to use the actual shopIds array field.
 */
