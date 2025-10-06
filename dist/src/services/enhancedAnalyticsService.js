"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedAnalyticsService = exports.EnhancedAnalyticsService = void 0;
const client_1 = require("../config/client");
const logger_1 = require("../utils/logger");
class EnhancedAnalyticsService {
    async generateAnalytics(dateRange, comparisonRange) {
        try {
            logger_1.logger.info('Generating enhanced analytics', { dateRange, comparisonRange });
            const [productPerformance, categoryPerformance, customerAnalytics, operationalMetrics, financialMetrics] = await Promise.all([
                this.getProductPerformance(dateRange, comparisonRange),
                this.getCategoryPerformance(dateRange, comparisonRange),
                this.getCustomerAnalytics(dateRange, comparisonRange),
                this.getOperationalMetrics(dateRange, comparisonRange),
                this.getFinancialMetrics(dateRange, comparisonRange)
            ]);
            const insights = await this.generateInsights({
                productPerformance,
                categoryPerformance,
                customerAnalytics,
                operationalMetrics,
                financialMetrics
            });
            return {
                productPerformance,
                categoryPerformance,
                customerAnalytics,
                operationalMetrics,
                financialMetrics,
                insights,
                generatedAt: new Date()
            };
        }
        catch (error) {
            logger_1.logger.error('Error generating enhanced analytics:', error);
            throw error;
        }
    }
    async getProductPerformance(dateRange, comparisonRange) {
        const currentPeriod = await this.getProductMetricsForPeriod(dateRange);
        const comparisonPeriod = await this.getProductMetricsForPeriod(comparisonRange);
        return currentPeriod.map(current => {
            const comparison = comparisonPeriod.find(p => p.id === current.id);
            const growthRate = comparison ? this.calculateGrowthRate(current.totalSold, comparison.totalSold) : 0;
            const trend = this.getTrendFromGrowthRate(growthRate);
            const efficiency = current.totalSold > 0 ? current.revenue / current.totalSold : 0;
            return {
                ...current,
                growthRate,
                trend,
                efficiency
            };
        }).sort((a, b) => b.revenue - a.revenue);
    }
    async getProductMetricsForPeriod(period) {
        const products = await client_1.prisma.product.findMany({
            include: {
                shopInventory: {
                    where: {
                        createdAt: { gte: period.from, lte: period.to }
                    }
                },
                category: true,
                flavor: true
            }
        });
        return products.map(product => {
            const currentStock = product.shopInventory.reduce((sum, inv) => sum + (inv.currentStock || 0), 0);
            return {
                id: product.id,
                name: product.name,
                category: product.category?.name || 'Unknown',
                flavor: product.flavor?.name || 'Unknown',
                currentStock,
                totalSold: 0, // This would need to be calculated from billing data
                revenue: 0 // This would need to be calculated from billing data
            };
        });
    }
    async getCategoryPerformance(dateRange, comparisonRange) {
        const currentPeriod = await this.getCategoryMetricsForPeriod(dateRange);
        const comparisonPeriod = await this.getCategoryMetricsForPeriod(comparisonRange);
        const totalRevenue = currentPeriod.reduce((sum, cat) => sum + cat.totalRevenue, 0);
        return currentPeriod.map(current => {
            const comparison = comparisonPeriod.find(c => c.name === current.name);
            const growthRate = comparison ? this.calculateGrowthRate(current.totalRevenue, comparison.totalRevenue) : 0;
            const trend = this.getTrendFromGrowthRate(growthRate);
            const marketShare = totalRevenue > 0 ? (current.totalRevenue / totalRevenue) * 100 : 0;
            return {
                ...current,
                growthRate,
                trend,
                marketShare
            };
        }).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }
    async getCategoryMetricsForPeriod(period) {
        const categories = await client_1.prisma.product.groupBy({
            by: ['categoryId'],
            where: {
                createdAt: { lte: period.to }
            },
            _count: { id: true },
            _sum: { unitPrice: true }
        });
        const categoryData = await Promise.all(categories.map(async (category) => {
            const products = await client_1.prisma.product.findMany({
                where: { categoryId: category.categoryId }
            });
            const totalRevenue = 0; // This would need to be calculated from billing data
            const totalSold = 0; // This would need to be calculated from billing data
            return {
                name: category.categoryId || 'Unknown',
                totalRevenue,
                totalSold,
                productCount: category._count.id,
                averagePrice: totalSold > 0 ? totalRevenue / totalSold : 0
            };
        }));
        return categoryData;
    }
    async getCustomerAnalytics(dateRange, comparisonRange) {
        const [currentCustomers, comparisonCustomers] = await Promise.all([
            this.getCustomerMetricsForPeriod(dateRange),
            this.getCustomerMetricsForPeriod(comparisonRange)
        ]);
        const totalCustomers = currentCustomers.length;
        const newCustomers = currentCustomers.filter(c => !comparisonCustomers.some(cc => cc.id === c.id)).length;
        const returningCustomers = totalCustomers - newCustomers;
        const totalRevenue = currentCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
        const averageOrderValue = totalRevenue / currentCustomers.reduce((sum, c) => sum + c.orderCount, 0);
        const customerLifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
        const topCustomers = currentCustomers
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);
        const customerSegments = this.calculateCustomerSegments(currentCustomers);
        return {
            totalCustomers,
            newCustomers,
            returningCustomers,
            averageOrderValue: averageOrderValue || 0,
            customerLifetimeValue,
            topCustomers,
            customerSegments
        };
    }
    async getCustomerMetricsForPeriod(period) {
        const customers = await client_1.prisma.billing.groupBy({
            by: ['customerEmail'],
            where: {
                createdAt: { gte: period.from, lte: period.to },
                paymentStatus: 'Paid'
            },
            _sum: { total: true },
            _count: { id: true }
        });
        const customerDetails = customers.map((customer) => {
            return {
                id: customer.customerEmail || 'unknown',
                name: customer.customerEmail || 'Unknown',
                totalSpent: customer._sum.total || 0,
                orderCount: customer._count.id,
                lastOrderDate: new Date()
            };
        });
        return customerDetails;
    }
    calculateCustomerSegments(customers) {
        const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
        const averageSpent = totalSpent / customers.length;
        const highValue = customers.filter(c => c.totalSpent > averageSpent * 2).length;
        const mediumValue = customers.filter(c => c.totalSpent > averageSpent * 0.5 && c.totalSpent <= averageSpent * 2).length;
        const lowValue = customers.filter(c => c.totalSpent <= averageSpent * 0.5).length;
        return { highValue, mediumValue, lowValue };
    }
    async getOperationalMetrics(dateRange, comparisonRange) {
        const [totalShops, activeShops, lowStockItems, pendingRestockRequests, restockRequests] = await Promise.all([
            client_1.prisma.shop.count(),
            client_1.prisma.shop.count({ where: { isActive: true } }),
            client_1.prisma.shopInventory.count({
                where: { currentStock: { lte: 10 }, isActive: true }
            }),
            client_1.prisma.restockRequest.count({ where: { status: 'pending' } }),
            client_1.prisma.restockRequest.findMany({
                where: {
                    createdAt: { gte: dateRange.from, lte: dateRange.to },
                    status: { in: ['approved', 'fulfilled'] }
                },
                select: { createdAt: true, updatedAt: true }
            })
        ]);
        const averageRestockTime = this.calculateAverageRestockTime(restockRequests);
        const inventoryTurnover = await this.calculateInventoryTurnover(dateRange);
        const systemHealth = this.determineSystemHealth({
            lowStockItems,
            pendingRestockRequests,
            averageRestockTime
        });
        return {
            totalShops,
            activeShops,
            lowStockItems,
            pendingRestockRequests,
            averageRestockTime,
            inventoryTurnover,
            systemHealth
        };
    }
    calculateAverageRestockTime(restockRequests) {
        if (restockRequests.length === 0)
            return 0;
        const totalTime = restockRequests.reduce((sum, req) => {
            const timeDiff = req.updatedAt.getTime() - req.createdAt.getTime();
            return sum + timeDiff;
        }, 0);
        return totalTime / restockRequests.length / (1000 * 60 * 60); // Convert to hours
    }
    async calculateInventoryTurnover(dateRange) {
        const totalSold = await client_1.prisma.shopInventory.aggregate({
            _sum: { currentStock: true },
            where: {
                createdAt: { gte: dateRange.from, lte: dateRange.to }
            }
        });
        const averageInventory = await client_1.prisma.shopInventory.aggregate({
            _avg: { currentStock: true },
            where: {
                createdAt: { gte: dateRange.from, lte: dateRange.to }
            }
        });
        const sold = totalSold._sum.currentStock || 0;
        const avgInventory = averageInventory._avg.currentStock || 1;
        return sold / avgInventory;
    }
    determineSystemHealth(metrics) {
        if (metrics.lowStockItems > 20 || metrics.pendingRestockRequests > 10) {
            return 'critical';
        }
        if (metrics.lowStockItems > 10 || metrics.pendingRestockRequests > 5 || metrics.averageRestockTime > 48) {
            return 'warning';
        }
        if (metrics.lowStockItems > 5 || metrics.pendingRestockRequests > 2 || metrics.averageRestockTime > 24) {
            return 'good';
        }
        return 'excellent';
    }
    async getFinancialMetrics(dateRange, comparisonRange) {
        const [current, comparison] = await Promise.all([
            this.getFinancialMetricsForPeriod(dateRange),
            this.getFinancialMetricsForPeriod(comparisonRange)
        ]);
        const revenueGrowth = this.calculateGrowthRate(current.totalRevenue, comparison.totalRevenue);
        const profitMargin = current.totalRevenue > 0 ? (current.netProfit / current.totalRevenue) * 100 : 0;
        const returnOnInvestment = current.operatingExpenses > 0 ? (current.netProfit / current.operatingExpenses) * 100 : 0;
        return {
            ...current,
            revenueGrowth,
            profitMargin,
            returnOnInvestment
        };
    }
    async getFinancialMetricsForPeriod(period) {
        const [revenue, expenses] = await Promise.all([
            client_1.prisma.billing.aggregate({
                _sum: { total: true },
                where: {
                    createdAt: { gte: period.from, lte: period.to },
                    paymentStatus: 'Paid'
                }
            }),
            client_1.prisma.billing.aggregate({
                _sum: { total: true },
                where: {
                    createdAt: { gte: period.from, lte: period.to },
                    paymentStatus: 'Paid'
                }
            })
        ]);
        const totalRevenue = revenue._sum.total || 0;
        const costOfGoodsSold = totalRevenue * 0.6; // Assume 60% COGS
        const operatingExpenses = totalRevenue * 0.2; // Assume 20% operating expenses
        const netProfit = totalRevenue - costOfGoodsSold - operatingExpenses;
        const cashFlow = netProfit; // Simplified cash flow calculation
        return {
            totalRevenue,
            averageOrderValue: 0, // Will be calculated separately
            costOfGoodsSold,
            operatingExpenses,
            netProfit,
            cashFlow
        };
    }
    async generateInsights(data) {
        const insights = [];
        // Product insights
        const topProduct = data.productPerformance[0];
        if (topProduct && topProduct.growthRate > 20) {
            insights.push({
                type: 'growth',
                category: 'product',
                title: 'Top Performing Product',
                description: `${topProduct.name} is showing strong growth with ${topProduct.growthRate.toFixed(1)}% increase in sales.`,
                impact: 'high',
                actionable: true,
                actionText: 'View Product Details',
                actionUrl: `/products/${topProduct.id}`,
                data: topProduct
            });
        }
        // Low stock insights
        if (data.operationalMetrics.lowStockItems > 5) {
            insights.push({
                type: 'warning',
                category: 'operational',
                title: 'Low Stock Alert',
                description: `${data.operationalMetrics.lowStockItems} products are running low on stock. Consider restocking soon.`,
                impact: 'high',
                actionable: true,
                actionText: 'View Low Stock Items',
                actionUrl: '/low-stock',
                data: { lowStockCount: data.operationalMetrics.lowStockItems }
            });
        }
        // Customer insights
        if (data.customerAnalytics.newCustomers > data.customerAnalytics.returningCustomers) {
            insights.push({
                type: 'growth',
                category: 'customer',
                title: 'New Customer Growth',
                description: `You have ${data.customerAnalytics.newCustomers} new customers this period, indicating strong market expansion.`,
                impact: 'medium',
                actionable: false,
                data: data.customerAnalytics
            });
        }
        // Financial insights
        if (data.financialMetrics.revenueGrowth > 15) {
            insights.push({
                type: 'growth',
                category: 'financial',
                title: 'Strong Revenue Growth',
                description: `Revenue has grown by ${data.financialMetrics.revenueGrowth.toFixed(1)}% compared to the previous period.`,
                impact: 'high',
                actionable: false,
                data: data.financialMetrics
            });
        }
        return insights;
    }
    calculateGrowthRate(current, previous) {
        if (previous === 0)
            return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }
    getTrendFromGrowthRate(growthRate) {
        if (growthRate > 5)
            return 'up';
        if (growthRate < -5)
            return 'down';
        return 'stable';
    }
}
exports.EnhancedAnalyticsService = EnhancedAnalyticsService;
exports.enhancedAnalyticsService = new EnhancedAnalyticsService();
