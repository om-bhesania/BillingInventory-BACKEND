"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiInsightsService = exports.AIInsightsService = void 0;
const logger_1 = require("../utils/logger");
class AIInsightsService {
    async generateInsights(analyticsData, dateRange) {
        try {
            logger_1.logger.info('Generating AI insights', { dateRange });
            const insights = [];
            // Financial insights
            insights.push(...await this.generateFinancialInsights(analyticsData, dateRange));
            // Product insights
            insights.push(...await this.generateProductInsights(analyticsData, dateRange));
            // Customer insights
            insights.push(...await this.generateCustomerInsights(analyticsData, dateRange));
            // Operational insights
            insights.push(...await this.generateOperationalInsights(analyticsData, dateRange));
            // Strategic insights
            insights.push(...await this.generateStrategicInsights(analyticsData, dateRange));
            // Sort by impact and confidence
            return insights
                .sort((a, b) => {
                const impactOrder = { high: 3, medium: 2, low: 1 };
                const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
                if (impactDiff !== 0)
                    return impactDiff;
                return b.confidence - a.confidence;
            })
                .slice(0, 20); // Limit to top 20 insights
        }
        catch (error) {
            logger_1.logger.error('Error generating AI insights:', error);
            throw error;
        }
    }
    async generateFinancialInsights(data, dateRange) {
        const insights = [];
        // Revenue growth analysis
        if (data.revenue.growth > 20) {
            insights.push({
                type: 'growth',
                category: 'financial',
                title: 'Exceptional Revenue Growth',
                description: `Revenue has grown by ${data.revenue.growth.toFixed(1)}% compared to the previous period. This indicates strong business performance and market demand.`,
                impact: 'high',
                actionable: false,
                confidence: Math.min(data.revenue.growth, 100),
                data: { revenue: data.revenue },
                generatedAt: new Date()
            });
        }
        else if (data.revenue.growth < -10) {
            insights.push({
                type: 'decline',
                category: 'financial',
                title: 'Revenue Decline Alert',
                description: `Revenue has decreased by ${Math.abs(data.revenue.growth).toFixed(1)}% compared to the previous period. Immediate attention is needed to identify and address the causes.`,
                impact: 'high',
                actionable: true,
                actionText: 'Analyze Revenue Trends',
                actionUrl: '/analytics/revenue',
                confidence: Math.min(Math.abs(data.revenue.growth), 100),
                data: { revenue: data.revenue },
                generatedAt: new Date()
            });
        }
        // Order value analysis
        const averageOrderValue = data.revenue.current / data.orders.current;
        if (averageOrderValue > 100) {
            insights.push({
                type: 'opportunity',
                category: 'financial',
                title: 'High Average Order Value',
                description: `Your average order value is $${averageOrderValue.toFixed(2)}, indicating strong customer spending. Consider upselling strategies to maximize revenue.`,
                impact: 'medium',
                actionable: true,
                actionText: 'Review Upselling Opportunities',
                actionUrl: '/products/upselling',
                confidence: 85,
                data: { averageOrderValue },
                generatedAt: new Date()
            });
        }
        return insights;
    }
    async generateProductInsights(data, dateRange) {
        const insights = [];
        // Top product analysis
        if (data.topProducts.length > 0) {
            const topProduct = data.topProducts[0];
            const secondProduct = data.topProducts[1];
            if (topProduct && secondProduct) {
                const dominance = (topProduct.revenue / (topProduct.revenue + secondProduct.revenue)) * 100;
                if (dominance > 60) {
                    insights.push({
                        type: 'warning',
                        category: 'product',
                        title: 'Product Concentration Risk',
                        description: `${topProduct.name} represents ${dominance.toFixed(1)}% of total product revenue. Consider diversifying your product portfolio to reduce risk.`,
                        impact: 'high',
                        actionable: true,
                        actionText: 'Diversify Product Portfolio',
                        actionUrl: '/products/diversification',
                        confidence: 90,
                        data: { topProduct, dominance },
                        generatedAt: new Date()
                    });
                }
            }
        }
        // Low stock analysis
        if (data.lowStockItems > 5) {
            insights.push({
                type: 'warning',
                category: 'operational',
                title: 'Inventory Shortage Alert',
                description: `${data.lowStockItems} products are running low on stock. This could lead to lost sales and customer dissatisfaction.`,
                impact: 'high',
                actionable: true,
                actionText: 'Review Low Stock Items',
                actionUrl: '/inventory/low-stock',
                confidence: 95,
                data: { lowStockItems: data.lowStockItems },
                generatedAt: new Date()
            });
        }
        return insights;
    }
    async generateCustomerInsights(data, dateRange) {
        const insights = [];
        // Customer growth analysis
        if (data.customers.growth > 15) {
            insights.push({
                type: 'growth',
                category: 'customer',
                title: 'Strong Customer Acquisition',
                description: `Customer base has grown by ${data.customers.growth.toFixed(1)}% this period. This indicates successful marketing and customer acquisition strategies.`,
                impact: 'high',
                actionable: false,
                confidence: Math.min(data.customers.growth, 100),
                data: { customers: data.customers },
                generatedAt: new Date()
            });
        }
        // Customer segment analysis
        if (data.customerSegments) {
            const { highValue, mediumValue, lowValue } = data.customerSegments;
            const totalCustomers = highValue + mediumValue + lowValue;
            if (highValue / totalCustomers > 0.3) {
                insights.push({
                    type: 'opportunity',
                    category: 'customer',
                    title: 'High-Value Customer Segment',
                    description: `${((highValue / totalCustomers) * 100).toFixed(1)}% of your customers are high-value. Focus on retention and upselling to this segment.`,
                    impact: 'medium',
                    actionable: true,
                    actionText: 'Customer Retention Strategy',
                    actionUrl: '/customers/retention',
                    confidence: 80,
                    data: { customerSegments: data.customerSegments },
                    generatedAt: new Date()
                });
            }
        }
        return insights;
    }
    async generateOperationalInsights(data, dateRange) {
        const insights = [];
        // Restock request analysis
        if (data.pendingRequests > 10) {
            insights.push({
                type: 'warning',
                category: 'operational',
                title: 'High Pending Restock Requests',
                description: `${data.pendingRequests} restock requests are pending approval. This could impact inventory availability and customer satisfaction.`,
                impact: 'high',
                actionable: true,
                actionText: 'Review Pending Requests',
                actionUrl: '/restock-requests',
                confidence: 90,
                data: { pendingRequests: data.pendingRequests },
                generatedAt: new Date()
            });
        }
        // Efficiency analysis
        const ordersPerCustomer = data.orders.current / data.customers.current;
        if (ordersPerCustomer > 3) {
            insights.push({
                type: 'growth',
                category: 'operational',
                title: 'High Customer Engagement',
                description: `Customers are placing an average of ${ordersPerCustomer.toFixed(1)} orders each, indicating strong engagement and satisfaction.`,
                impact: 'medium',
                actionable: false,
                confidence: 75,
                data: { ordersPerCustomer },
                generatedAt: new Date()
            });
        }
        return insights;
    }
    async generateStrategicInsights(data, dateRange) {
        const insights = [];
        // Market opportunity analysis
        const revenueGrowth = data.revenue.growth;
        const customerGrowth = data.customers.growth;
        if (revenueGrowth > customerGrowth * 1.5) {
            insights.push({
                type: 'opportunity',
                category: 'strategic',
                title: 'Revenue Per Customer Growth',
                description: `Revenue is growing faster than customer acquisition (${revenueGrowth.toFixed(1)}% vs ${customerGrowth.toFixed(1)}%), indicating successful upselling and customer value increase.`,
                impact: 'high',
                actionable: true,
                actionText: 'Scale Upselling Strategy',
                actionUrl: '/strategy/upselling',
                confidence: 85,
                data: { revenueGrowth, customerGrowth },
                generatedAt: new Date()
            });
        }
        // Seasonal trend analysis
        const currentMonth = new Date().getMonth();
        const isPeakSeason = currentMonth >= 4 && currentMonth <= 8; // May to September
        if (isPeakSeason && data.revenue.growth > 10) {
            insights.push({
                type: 'opportunity',
                category: 'strategic',
                title: 'Peak Season Performance',
                description: `Strong performance during peak season with ${data.revenue.growth.toFixed(1)}% revenue growth. Consider expanding capacity or inventory for next year.`,
                impact: 'medium',
                actionable: true,
                actionText: 'Plan Next Season',
                actionUrl: '/strategy/seasonal-planning',
                confidence: 80,
                data: { season: 'peak', revenueGrowth: data.revenue.growth },
                generatedAt: new Date()
            });
        }
        // Business health score
        const healthScore = this.calculateBusinessHealthScore(data);
        if (healthScore > 80) {
            insights.push({
                type: 'growth',
                category: 'strategic',
                title: 'Excellent Business Health',
                description: `Your business health score is ${healthScore}/100, indicating strong overall performance across all metrics.`,
                impact: 'high',
                actionable: false,
                confidence: 90,
                data: { healthScore },
                generatedAt: new Date()
            });
        }
        else if (healthScore < 50) {
            insights.push({
                type: 'warning',
                category: 'strategic',
                title: 'Business Health Concerns',
                description: `Your business health score is ${healthScore}/100, indicating areas for improvement. Focus on key performance indicators.`,
                impact: 'high',
                actionable: true,
                actionText: 'Business Health Analysis',
                actionUrl: '/strategy/health-analysis',
                confidence: 85,
                data: { healthScore },
                generatedAt: new Date()
            });
        }
        return insights;
    }
    calculateBusinessHealthScore(data) {
        let score = 0;
        let factors = 0;
        // Revenue growth (30% weight)
        if (data.revenue.growth > 0) {
            score += Math.min(data.revenue.growth * 2, 30);
        }
        factors += 30;
        // Customer growth (25% weight)
        if (data.customers.growth > 0) {
            score += Math.min(data.customers.growth * 2, 25);
        }
        factors += 25;
        // Order growth (20% weight)
        if (data.orders.growth > 0) {
            score += Math.min(data.orders.growth * 2, 20);
        }
        factors += 20;
        // Low stock penalty (15% weight)
        const lowStockPenalty = Math.min(data.lowStockItems * 2, 15);
        score += (15 - lowStockPenalty);
        factors += 15;
        // Pending requests penalty (10% weight)
        const pendingPenalty = Math.min(data.pendingRequests * 1, 10);
        score += (10 - pendingPenalty);
        factors += 10;
        return Math.round((score / factors) * 100);
    }
    async generatePredictiveInsights(data, dateRange) {
        const insights = [];
        // Predict next month's performance
        const predictedRevenue = data.revenue.current * (1 + data.revenue.growth / 100);
        const predictedOrders = data.orders.current * (1 + data.orders.growth / 100);
        if (predictedRevenue > data.revenue.current * 1.1) {
            insights.push({
                type: 'opportunity',
                category: 'strategic',
                title: 'Positive Revenue Forecast',
                description: `Based on current trends, next month's revenue is predicted to be $${predictedRevenue.toFixed(0)}, representing continued growth.`,
                impact: 'medium',
                actionable: true,
                actionText: 'Plan for Growth',
                actionUrl: '/forecasting/revenue',
                confidence: 70,
                data: { predictedRevenue, currentRevenue: data.revenue.current },
                generatedAt: new Date()
            });
        }
        return insights;
    }
}
exports.AIInsightsService = AIInsightsService;
exports.aiInsightsService = new AIInsightsService();
