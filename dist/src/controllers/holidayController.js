"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HolidayController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class HolidayController {
    // Get holidays for a user/shop
    static async getHolidays(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const { year, shopId } = req.query;
            const yearNum = year ? parseInt(year) : new Date().getFullYear();
            // Build where clause based on user role and shop access
            let whereClause = {
                year: yearNum
            };
            if (user.role === 'Admin') {
                // Admin can see all holidays or filter by shop
                if (shopId && shopId !== 'all') {
                    whereClause.shopId = shopId;
                }
            }
            else {
                // Shop owners can only see their shop holidays
                const userShopIds = user.shopIds || [];
                if (userShopIds.length > 0) {
                    whereClause.shopId = { in: userShopIds };
                }
                else {
                    return res.status(403).json({ error: 'No shop access' });
                }
            }
            const holidays = await prisma.holiday.findMany({
                where: whereClause,
                include: {
                    shop: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    date: 'asc'
                }
            });
            res.json({
                success: true,
                data: holidays,
                year: yearNum
            });
        }
        catch (error) {
            console.error('Error fetching holidays:', error);
            res.status(500).json({ error: 'Failed to fetch holidays' });
        }
    }
    // Create a new holiday
    static async createHoliday(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const { name, date, type, shopId, description } = req.body;
            // Validate required fields
            if (!name || !date) {
                return res.status(400).json({ error: 'Name and date are required' });
            }
            // Check if user has access to the shop
            if (user.role !== 'Admin') {
                const userShopIds = user.shopIds || [];
                if (!userShopIds.includes(shopId)) {
                    return res.status(403).json({ error: 'Access denied to this shop' });
                }
            }
            // Check if holiday already exists for this date and shop
            const existingHoliday = await prisma.holiday.findFirst({
                where: {
                    date: new Date(date),
                    shopId: shopId || null
                }
            });
            if (existingHoliday) {
                return res.status(400).json({ error: 'Holiday already exists for this date' });
            }
            const holiday = await prisma.holiday.create({
                data: {
                    name,
                    date: new Date(date),
                    type: type || 'HOLIDAY',
                    shopId: shopId || null,
                    description,
                    year: new Date(date).getFullYear(),
                    createdBy: user.publicId
                },
                include: {
                    shop: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            res.status(201).json({
                success: true,
                data: holiday,
                message: 'Holiday created successfully'
            });
        }
        catch (error) {
            console.error('Error creating holiday:', error);
            res.status(500).json({ error: 'Failed to create holiday' });
        }
    }
    // Update a holiday
    static async updateHoliday(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const { id } = req.params;
            const { name, date, type, description } = req.body;
            // Get the existing holiday
            const existingHoliday = await prisma.holiday.findUnique({
                where: { id }
            });
            if (!existingHoliday) {
                return res.status(404).json({ error: 'Holiday not found' });
            }
            // Check if user has access to update this holiday
            if (user.role !== 'Admin') {
                const userShopIds = user.shopIds || [];
                if (existingHoliday.shopId && !userShopIds.includes(existingHoliday.shopId)) {
                    return res.status(403).json({ error: 'Access denied to this holiday' });
                }
            }
            const updatedHoliday = await prisma.holiday.update({
                where: { id },
                data: {
                    name,
                    date: date ? new Date(date) : undefined,
                    type,
                    description,
                    year: date ? new Date(date).getFullYear() : undefined
                },
                include: {
                    shop: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            res.json({
                success: true,
                data: updatedHoliday,
                message: 'Holiday updated successfully'
            });
        }
        catch (error) {
            console.error('Error updating holiday:', error);
            res.status(500).json({ error: 'Failed to update holiday' });
        }
    }
    // Delete a holiday
    static async deleteHoliday(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const { id } = req.params;
            // Get the existing holiday
            const existingHoliday = await prisma.holiday.findUnique({
                where: { id }
            });
            if (!existingHoliday) {
                return res.status(404).json({ error: 'Holiday not found' });
            }
            // Check if user has access to delete this holiday
            if (user.role !== 'Admin') {
                const userShopIds = user.shopIds || [];
                if (existingHoliday.shopId && !userShopIds.includes(existingHoliday.shopId)) {
                    return res.status(403).json({ error: 'Access denied to this holiday' });
                }
            }
            await prisma.holiday.delete({
                where: { id }
            });
            res.json({
                success: true,
                message: 'Holiday deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting holiday:', error);
            res.status(500).json({ error: 'Failed to delete holiday' });
        }
    }
    // Get holiday statistics
    static async getHolidayStats(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const { year } = req.query;
            const yearNum = year ? parseInt(year) : new Date().getFullYear();
            // Build where clause based on user role
            let whereClause = {
                year: yearNum
            };
            if (user.role !== 'Admin') {
                const userShopIds = user.shopIds || [];
                if (userShopIds.length > 0) {
                    whereClause.shopId = { in: userShopIds };
                }
                else {
                    return res.status(403).json({ error: 'No shop access' });
                }
            }
            const totalHolidays = await prisma.holiday.count({
                where: whereClause
            });
            const holidaysByType = await prisma.holiday.groupBy({
                by: ['type'],
                where: whereClause,
                _count: {
                    type: true
                }
            });
            const upcomingHolidays = await prisma.holiday.findMany({
                where: {
                    ...whereClause,
                    date: {
                        gte: new Date()
                    }
                },
                orderBy: {
                    date: 'asc'
                },
                take: 5,
                include: {
                    shop: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            res.json({
                success: true,
                data: {
                    totalHolidays,
                    holidaysByType,
                    upcomingHolidays,
                    year: yearNum
                }
            });
        }
        catch (error) {
            console.error('Error fetching holiday stats:', error);
            res.status(500).json({ error: 'Failed to fetch holiday statistics' });
        }
    }
}
exports.HolidayController = HolidayController;
