"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const now = new Date();
        const current30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const current30DaysEnd = now;
        const previous60DaysStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const previous60DaysEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const calculateGrowth = (current, previous) => {
            if (previous === 0)
                return current > 0 ? '+100%' : '0%';
            const growth = ((current - previous) / previous) * 100;
            return growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
        };
        const customerBase = await prisma.user.count({
            where: {
                AND: [
                    { sellerKyc: null },
                    { driver: null }
                ]
            }
        });
        const customerBaseCurrent30Days = await prisma.user.count({
            where: {
                AND: [
                    { sellerKyc: null },
                    { driver: null },
                    {
                        createdAt: {
                            gte: current30DaysStart,
                            lte: current30DaysEnd,
                        }
                    }
                ]
            }
        });
        const customerBasePrevious60Days = await prisma.user.count({
            where: {
                AND: [
                    { sellerKyc: null },
                    { driver: null },
                    {
                        createdAt: {
                            gte: previous60DaysStart,
                            lte: previous60DaysEnd,
                        }
                    }
                ]
            }
        });
        const ecommerceSellers = await prisma.user.count({
            where: {
                sellerKyc: {
                    isNot: null
                }
            }
        });
        const ecommerceSellersCurrent30Days = await prisma.user.count({
            where: {
                AND: [
                    {
                        sellerKyc: {
                            isNot: null
                        }
                    },
                    {
                        createdAt: {
                            gte: current30DaysStart,
                            lte: current30DaysEnd,
                        }
                    }
                ]
            }
        });
        const ecommerceSellersPrevious60Days = await prisma.user.count({
            where: {
                AND: [
                    {
                        sellerKyc: {
                            isNot: null
                        }
                    },
                    {
                        createdAt: {
                            gte: previous60DaysStart,
                            lte: previous60DaysEnd,
                        }
                    }
                ]
            }
        });
        const rideDrivers = await prisma.user.count({
            where: {
                driver: {
                    isNot: null
                }
            }
        });
        const rideDriversCurrent30Days = await prisma.user.count({
            where: {
                AND: [
                    {
                        driver: {
                            isNot: null
                        }
                    },
                    {
                        createdAt: {
                            gte: current30DaysStart,
                            lte: current30DaysEnd,
                        }
                    }
                ]
            }
        });
        const rideDriversPrevious60Days = await prisma.user.count({
            where: {
                AND: [
                    {
                        driver: {
                            isNot: null
                        }
                    },
                    {
                        createdAt: {
                            gte: previous60DaysStart,
                            lte: previous60DaysEnd,
                        }
                    }
                ]
            }
        });
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const serviceFeeTransactions = await prisma.externalTransaction.findMany({
            where: {
                transactionType: 'SERVICE_FEE',
                currencyCode: 'GMD',
                status: 'SUCCESS',
                createdAt: {
                    gte: currentMonthStart,
                    lte: currentMonthEnd,
                },
            },
            select: {
                amount: true,
            }
        });
        const totalRevenue = serviceFeeTransactions.reduce((sum, transaction) => {
            return sum + Number(transaction.amount);
        }, 0);
        const revenueCurrent30Days = await prisma.externalTransaction.aggregate({
            where: {
                transactionType: 'SERVICE_FEE',
                currencyCode: 'GMD',
                status: 'SUCCESS',
                createdAt: {
                    gte: current30DaysStart,
                    lte: current30DaysEnd,
                },
            },
            _sum: {
                amount: true,
            }
        });
        const revenuePrevious60Days = await prisma.externalTransaction.aggregate({
            where: {
                transactionType: 'SERVICE_FEE',
                currencyCode: 'GMD',
                status: 'SUCCESS',
                createdAt: {
                    gte: previous60DaysStart,
                    lte: previous60DaysEnd,
                },
            },
            _sum: {
                amount: true,
            }
        });
        const currentRevenue = Number(revenueCurrent30Days._sum.amount || 0);
        const previousRevenue = Number(revenuePrevious60Days._sum.amount || 0);
        const recentActivities = [];
        const recentCustomers = await prisma.user.findMany({
            where: {
                AND: [
                    { sellerKyc: null },
                    { driver: null }
                ]
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 3
        });
        recentCustomers.forEach(customer => {
            recentActivities.push({
                id: customer.id,
                type: 'CUSTOMER_REGISTRATION',
                title: 'New Customer Registration',
                description: `${customer.firstName} ${customer.lastName} (${customer.phoneNumber})`,
                timestamp: customer.createdAt,
                icon: '👤'
            });
        });
        const recentSellers = await prisma.user.findMany({
            where: {
                sellerKyc: {
                    isNot: null
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                sellerKyc: {
                    select: {
                        businessName: true,
                        createdAt: true
                    }
                }
            },
            orderBy: {
                sellerKyc: {
                    createdAt: 'desc'
                }
            },
            take: 2
        });
        recentSellers.forEach(seller => {
            recentActivities.push({
                id: seller.id,
                type: 'SELLER_REGISTRATION',
                title: 'New Seller Registration',
                description: `${seller.firstName} ${seller.lastName} (${seller.phoneNumber}) - ${seller.sellerKyc?.businessName || 'Business'}`,
                timestamp: seller.sellerKyc?.createdAt || new Date(),
                icon: '🏪'
            });
        });
        const recentDrivers = await prisma.user.findMany({
            where: {
                driver: {
                    isNot: null
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                driver: {
                    select: {
                        createdAt: true
                    }
                }
            },
            orderBy: {
                driver: {
                    createdAt: 'desc'
                }
            },
            take: 2
        });
        recentDrivers.forEach(driver => {
            recentActivities.push({
                id: driver.id,
                type: 'DRIVER_REGISTRATION',
                title: 'New Driver Registration',
                description: `${driver.firstName} ${driver.lastName} (${driver.phoneNumber})`,
                timestamp: driver.driver?.createdAt || new Date(),
                icon: '🚗'
            });
        });
        const recentSettlements = await prisma.settlement.findMany({
            select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
                createdAt: true,
                userId: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 2
        });
        const settlementUsers = await prisma.user.findMany({
            where: {
                id: {
                    in: recentSettlements.map(s => s.userId)
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
            }
        });
        const userMap = new Map(settlementUsers.map(user => [user.id, user]));
        recentSettlements.forEach(settlement => {
            const user = userMap.get(settlement.userId);
            recentActivities.push({
                id: settlement.id,
                type: 'SETTLEMENT_REQUEST',
                title: 'Settlement Request',
                description: `${user?.firstName || 'User'} ${user?.lastName || ''} (${user?.phoneNumber || 'N/A'}) - ${settlement.currency} ${settlement.amount}`,
                timestamp: settlement.createdAt,
                icon: '💰'
            });
        });
        const recentOrders = await prisma.orders.findMany({
            select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                currencyCode: true,
                status: true,
                createdAt: true,
                userId: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 2
        });
        const orderUsers = await prisma.user.findMany({
            where: {
                id: {
                    in: recentOrders.map(o => o.userId)
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
            }
        });
        const orderUserMap = new Map(orderUsers.map(user => [user.id, user]));
        recentOrders.forEach(order => {
            const user = orderUserMap.get(order.userId);
            recentActivities.push({
                id: order.id,
                type: 'ORDER',
                title: 'New Order',
                description: `${user?.firstName || 'Customer'} ${user?.lastName || ''} (${user?.phoneNumber || 'N/A'}) - Order #${order.orderNumber} - ${order.currencyCode} ${order.totalAmount}`,
                timestamp: order.createdAt,
                icon: '📦'
            });
        });
        const recentProducts = await prisma.product.findMany({
            select: {
                id: true,
                title: true,
                price: true,
                currencyCode: true,
                createdAt: true,
                sellerId: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 2
        });
        const productSellers = await prisma.user.findMany({
            where: {
                id: {
                    in: recentProducts.map(p => p.sellerId)
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
            }
        });
        const productSellerMap = new Map(productSellers.map(user => [user.id, user]));
        recentProducts.forEach(product => {
            const seller = productSellerMap.get(product.sellerId);
            recentActivities.push({
                id: product.id,
                type: 'PRODUCT',
                title: 'New Product Uploaded',
                description: `${seller?.firstName || 'Seller'} ${seller?.lastName || ''} (${seller?.phoneNumber || 'N/A'}) - ${product.title} - ${product.currencyCode} ${product.price}`,
                timestamp: product.createdAt,
                icon: '🛍️'
            });
        });
        const recentRides = await prisma.ride.findMany({
            select: {
                id: true,
                totalFare: true,
                status: true,
                createdAt: true,
                customerId: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 2
        });
        const rideCustomers = await prisma.user.findMany({
            where: {
                id: {
                    in: recentRides.map(r => r.customerId)
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
            }
        });
        const rideCustomerMap = new Map(rideCustomers.map(user => [user.id, user]));
        recentRides.forEach(ride => {
            const customer = rideCustomerMap.get(ride.customerId);
            recentActivities.push({
                id: ride.id,
                type: 'RIDE',
                title: 'New Ride',
                description: `${customer?.firstName || 'Customer'} ${customer?.lastName || ''} (${customer?.phoneNumber || 'N/A'}) - GMD ${ride.totalFare}`,
                timestamp: ride.createdAt,
                icon: '🚕'
            });
        });
        const sortedActivities = recentActivities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10);
        const revenueTrendData = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
            const ridesServiceFee = await prisma.externalTransaction.aggregate({
                where: {
                    transactionType: 'SERVICE_FEE',
                    appService: 'RIDES',
                    currencyCode: 'GMD',
                    status: 'SUCCESS',
                    createdAt: {
                        gte: dayStart,
                        lte: dayEnd,
                    },
                },
                _sum: {
                    amount: true,
                }
            });
            const ecommerceServiceFee = await prisma.externalTransaction.aggregate({
                where: {
                    transactionType: 'SERVICE_FEE',
                    appService: 'ECOMMERCE',
                    currencyCode: 'GMD',
                    status: 'SUCCESS',
                    createdAt: {
                        gte: dayStart,
                        lte: dayEnd,
                    },
                },
                _sum: {
                    amount: true,
                }
            });
            revenueTrendData.push({
                date: dayStart.toISOString().split('T')[0],
                rides: Number(ridesServiceFee._sum.amount || 0),
                ecommerce: Number(ecommerceServiceFee._sum.amount || 0),
            });
        }
        const userGrowthData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
            const customersCount = await prisma.user.count({
                where: {
                    AND: [
                        { sellerKyc: null },
                        { driver: null },
                        {
                            createdAt: {
                                gte: dayStart,
                                lte: dayEnd,
                            }
                        }
                    ]
                }
            });
            const sellersCount = await prisma.user.count({
                where: {
                    AND: [
                        {
                            sellerKyc: {
                                isNot: null
                            }
                        },
                        {
                            createdAt: {
                                gte: dayStart,
                                lte: dayEnd,
                            }
                        }
                    ]
                }
            });
            const driversCount = await prisma.user.count({
                where: {
                    AND: [
                        {
                            driver: {
                                isNot: null
                            }
                        },
                        {
                            createdAt: {
                                gte: dayStart,
                                lte: dayEnd,
                            }
                        }
                    ]
                }
            });
            userGrowthData.push({
                date: dayStart.toISOString().split('T')[0],
                customers: customersCount,
                sellers: sellersCount,
                drivers: driversCount,
            });
        }
        const userGrowthTrendData = [];
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const startOfThirtyDaysAgo = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 0, 0, 0, 0);
        const baselineCustomers = await prisma.user.count({
            where: {
                AND: [
                    { sellerKyc: null },
                    { driver: null },
                    {
                        createdAt: {
                            lt: startOfThirtyDaysAgo,
                        }
                    }
                ]
            }
        });
        const baselineSellers = await prisma.user.count({
            where: {
                AND: [
                    {
                        sellerKyc: {
                            isNot: null
                        }
                    },
                    {
                        createdAt: {
                            lt: startOfThirtyDaysAgo,
                        }
                    }
                ]
            }
        });
        const baselineDrivers = await prisma.user.count({
            where: {
                AND: [
                    {
                        driver: {
                            isNot: null
                        }
                    },
                    {
                        createdAt: {
                            lt: startOfThirtyDaysAgo,
                        }
                    }
                ]
            }
        });
        let runningCustomers = baselineCustomers;
        let runningSellers = baselineSellers;
        let runningDrivers = baselineDrivers;
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
            const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
            const dailyCustomers = await prisma.user.count({
                where: {
                    AND: [
                        { sellerKyc: null },
                        { driver: null },
                        {
                            createdAt: {
                                gte: dayStart,
                                lte: dayEnd,
                            }
                        }
                    ]
                }
            });
            const dailySellers = await prisma.user.count({
                where: {
                    AND: [
                        {
                            sellerKyc: {
                                isNot: null
                            }
                        },
                        {
                            createdAt: {
                                gte: dayStart,
                                lte: dayEnd,
                            }
                        }
                    ]
                }
            });
            const dailyDrivers = await prisma.user.count({
                where: {
                    AND: [
                        {
                            driver: {
                                isNot: null
                            }
                        },
                        {
                            createdAt: {
                                gte: dayStart,
                                lte: dayEnd,
                            }
                        }
                    ]
                }
            });
            runningCustomers += dailyCustomers;
            runningSellers += dailySellers;
            runningDrivers += dailyDrivers;
            userGrowthTrendData.push({
                date: dayEnd.toISOString().split('T')[0],
                customers: runningCustomers,
                sellers: runningSellers,
                drivers: runningDrivers,
            });
        }
        res.json({
            success: true,
            data: {
                customerBase,
                ecommerceSellers,
                rideDrivers,
                totalRevenue,
                currentMonth: currentMonthName,
                currency: 'GMD',
                customerBaseGrowth: calculateGrowth(customerBaseCurrent30Days, customerBasePrevious60Days),
                ecommerceSellersGrowth: calculateGrowth(ecommerceSellersCurrent30Days, ecommerceSellersPrevious60Days),
                rideDriversGrowth: calculateGrowth(rideDriversCurrent30Days, rideDriversPrevious60Days),
                totalRevenueGrowth: calculateGrowth(currentRevenue, previousRevenue),
                revenueData: revenueTrendData,
                userGrowthData: userGrowthData,
                userGrowthTrendData: userGrowthTrendData,
                recentActivities: sortedActivities,
            },
        });
    }
    catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map