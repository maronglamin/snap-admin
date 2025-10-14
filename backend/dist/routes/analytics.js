"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const permissions_1 = require("../middleware/permissions");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get('/revenue/overview', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { period = '30', currency = 'GMD' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(period));
        const [rideRevenue, ecommerceRevenue] = await Promise.all([
            prisma.ride.aggregate({
                where: {
                    status: 'COMPLETED',
                    paymentStatus: 'PAID',
                    createdAt: { gte: startDate },
                    rideRequest: {
                        currency: currency,
                    },
                },
                _sum: { totalFare: true },
            }),
            prisma.orders.aggregate({
                where: {
                    status: { in: ['CONFIRMED', 'COMPLETED'] },
                    paymentStatus: { in: ['SETTLED', 'PAID'] },
                    createdAt: { gte: startDate },
                    currencyCode: currency,
                },
                _sum: { totalAmount: true },
            }),
        ]);
        const totalRevenue = Number(rideRevenue._sum.totalFare || 0) + Number(ecommerceRevenue._sum.totalAmount || 0);
        res.json({
            period: Number(period),
            currency: currency,
            summary: {
                totalRevenue: totalRevenue,
                rideRevenue: rideRevenue._sum.totalFare || 0,
                ecommerceRevenue: ecommerceRevenue._sum.totalAmount || 0,
            },
        });
    }
    catch (error) {
        console.error('Error fetching total revenue details:', error);
        res.status(500).json({ error: 'Failed to fetch total revenue details' });
    }
});
router.get('/revenue/ride-revenue-details', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { period = '30', page = '1', limit = '10', currency = 'GMD' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(period));
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        const [rides, totalRides] = await Promise.all([
            prisma.ride.findMany({
                where: {
                    status: 'COMPLETED',
                    paymentStatus: 'PAID',
                    createdAt: { gte: startDate },
                    rideRequest: {
                        currency: currency,
                    },
                },
                include: {
                    driver: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },
                    customer: {
                        select: {
                            firstName: true,
                            lastName: true,
                            phoneNumber: true,
                        },
                    },
                    rideRequest: {
                        select: {
                            currency: true,
                            currencySymbol: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
            }),
            prisma.ride.count({
                where: {
                    status: 'COMPLETED',
                    paymentStatus: 'PAID',
                    createdAt: { gte: startDate },
                    rideRequest: {
                        currency: currency,
                    },
                },
            }),
        ]);
        const totalPages = Math.ceil(totalRides / limitNum);
        const transactions = rides.map(ride => ({
            id: ride.id,
            rideId: ride.rideId,
            amount: ride.totalFare,
            date: ride.createdAt,
            status: ride.paymentStatus,
            driver: `${ride.driver.user.firstName} ${ride.driver.user.lastName}`,
            customer: `${ride.customer.firstName} ${ride.customer.lastName}`,
            driverPhone: ride.driver.user.phoneNumber,
            customerPhone: ride.customer.phoneNumber,
            pickupLocation: ride.pickupLocation,
            destinationLocation: ride.destinationLocation,
            distance: ride.distance,
            duration: ride.duration,
            baseFare: ride.baseFare,
            distanceFare: ride.distanceFare,
            timeFare: ride.timeFare,
            surgeFare: ride.surgeFare,
            driverEarnings: ride.driverEarnings,
            platformFee: ride.platformFee,
        }));
        res.json({
            period: Number(period),
            currency: currency,
            transactions,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: totalRides,
                itemsPerPage: limitNum,
            },
        });
    }
    catch (error) {
        console.error('Error fetching ride revenue details:', error);
        res.status(500).json({ error: 'Failed to fetch ride revenue details' });
    }
});
router.get('/revenue/ecommerce-revenue-details', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { period = '30', page = '1', limit = '10', currency = 'GMD' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(period));
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        const [orders, totalOrders] = await Promise.all([
            prisma.orders.findMany({
                where: {
                    status: { in: ['CONFIRMED', 'COMPLETED'] },
                    paymentStatus: { in: ['SETTLED', 'PAID'] },
                    createdAt: { gte: startDate },
                    currencyCode: currency,
                },
                include: {
                    User_orders_sellerIdToUser: {
                        select: {
                            firstName: true,
                            lastName: true,
                            phoneNumber: true,
                        },
                    },
                    User_orders_userIdToUser: {
                        select: {
                            firstName: true,
                            lastName: true,
                            phoneNumber: true,
                        },
                    },
                    items: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
            }),
            prisma.orders.count({
                where: {
                    status: { in: ['CONFIRMED', 'COMPLETED'] },
                    paymentStatus: { in: ['SETTLED', 'PAID'] },
                    createdAt: { gte: startDate },
                    currencyCode: currency,
                },
            }),
        ]);
        const totalPages = Math.ceil(totalOrders / limitNum);
        const transactions = orders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            amount: order.totalAmount,
            date: order.createdAt,
            status: order.paymentStatus,
            seller: `${order.User_orders_sellerIdToUser.firstName} ${order.User_orders_sellerIdToUser.lastName}`,
            customer: `${order.User_orders_userIdToUser.firstName} ${order.User_orders_userIdToUser.lastName}`,
            sellerPhone: order.User_orders_sellerIdToUser.phoneNumber,
            customerPhone: order.User_orders_userIdToUser.phoneNumber,
            productCount: order.items?.length || 0,
            subtotal: order.subtotal,
            taxAmount: order.taxAmount,
            shippingAmount: order.shippingAmount,
            discountAmount: order.discountAmount,
            currencyCode: order.currencyCode,
        }));
        res.json({
            period: Number(period),
            currency: currency,
            transactions,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: totalOrders,
                itemsPerPage: limitNum,
            },
        });
    }
    catch (error) {
        console.error('Error fetching e-commerce revenue details:', error);
        res.status(500).json({ error: 'Failed to fetch e-commerce revenue details' });
    }
});
router.get('/revenue/available-currencies', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const [rideCurrencies, orderCurrencies] = await Promise.all([
            prisma.rideRequest.groupBy({
                by: ['currency'],
                _count: {
                    currency: true,
                },
                orderBy: {
                    currency: 'asc',
                },
            }),
            prisma.orders.groupBy({
                by: ['currencyCode'],
                _count: {
                    currencyCode: true,
                },
                orderBy: {
                    currencyCode: 'asc',
                },
            }),
        ]);
        const currencies = new Set();
        rideCurrencies.forEach(item => {
            if (item.currency) {
                currencies.add(item.currency);
            }
        });
        orderCurrencies.forEach(item => {
            if (item.currencyCode) {
                currencies.add(item.currencyCode);
            }
        });
        const availableCurrencies = Array.from(currencies).sort();
        res.json({
            currencies: availableCurrencies,
            rideCurrencies: rideCurrencies.map(item => ({
                currency: item.currency,
                count: item._count.currency,
            })),
            orderCurrencies: orderCurrencies.map(item => ({
                currency: item.currencyCode,
                count: item._count.currencyCode,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching available currencies:', error);
        res.status(500).json({ error: 'Failed to fetch available currencies' });
    }
});
router.get('/revenue/external-transactions-overview', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { period = '30', currency = 'GMD' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(period));
        const externalTransactions = await prisma.externalTransaction.groupBy({
            by: ['transactionType', 'appService'],
            where: {
                status: 'SUCCESS',
                currencyCode: currency,
                createdAt: { gte: startDate },
            },
            _sum: {
                amount: true,
            },
            _count: {
                id: true,
            },
        });
        const totalAmount = externalTransactions.reduce((sum, item) => sum + Number(item._sum.amount || 0), 0);
        const totalTransactions = externalTransactions.reduce((sum, item) => sum + item._count.id, 0);
        const byTransactionType = externalTransactions.reduce((acc, item) => {
            if (!acc[item.transactionType]) {
                acc[item.transactionType] = { amount: 0, count: 0 };
            }
            acc[item.transactionType].amount += Number(item._sum.amount || 0);
            acc[item.transactionType].count += item._count.id;
            return acc;
        }, {});
        const byAppService = externalTransactions.reduce((acc, item) => {
            if (!acc[item.appService]) {
                acc[item.appService] = { amount: 0, count: 0 };
            }
            acc[item.appService].amount += Number(item._sum.amount || 0);
            acc[item.appService].count += item._count.id;
            return acc;
        }, {});
        const feesByService = externalTransactions
            .filter(item => item.transactionType === 'FEE')
            .reduce((acc, item) => {
            if (!acc[item.appService]) {
                acc[item.appService] = { amount: 0, count: 0 };
            }
            acc[item.appService].amount += Number(item._sum.amount || 0);
            acc[item.appService].count += item._count.id;
            return acc;
        }, {});
        const serviceFeesByService = externalTransactions
            .filter(item => item.transactionType === 'SERVICE_FEE')
            .reduce((acc, item) => {
            if (!acc[item.appService]) {
                acc[item.appService] = { amount: 0, count: 0 };
            }
            acc[item.appService].amount += Number(item._sum.amount || 0);
            acc[item.appService].count += item._count.id;
            return acc;
        }, {});
        res.json({
            period: Number(period),
            currency: currency,
            summary: {
                totalAmount,
                totalTransactions,
                byTransactionType,
                byAppService,
                feesByService,
                serviceFeesByService,
            },
        });
    }
    catch (error) {
        console.error('Error fetching external transactions overview:', error);
        res.status(500).json({ error: 'Failed to fetch external transactions overview' });
    }
});
router.get('/revenue/external-transactions-details', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { period = '30', page = '1', limit = '10', currency = 'GMD' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(period));
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        const [transactions, totalTransactions] = await Promise.all([
            prisma.externalTransaction.findMany({
                where: {
                    status: 'SUCCESS',
                    currencyCode: currency,
                    createdAt: { gte: startDate },
                },
                include: {
                    customer: {
                        select: {
                            firstName: true,
                            lastName: true,
                            phoneNumber: true,
                        },
                    },
                    seller: {
                        select: {
                            firstName: true,
                            lastName: true,
                            phoneNumber: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
            }),
            prisma.externalTransaction.count({
                where: {
                    status: 'SUCCESS',
                    currencyCode: currency,
                    createdAt: { gte: startDate },
                },
            }),
        ]);
        const totalPages = Math.ceil(totalTransactions / limitNum);
        const formattedTransactions = transactions.map(transaction => ({
            id: transaction.id,
            appTransactionId: transaction.appTransactionId,
            amount: transaction.amount,
            currencyCode: transaction.currencyCode,
            transactionType: transaction.transactionType,
            appService: transaction.appService,
            gatewayProvider: transaction.gatewayProvider,
            gatewayTransactionId: transaction.gatewayTransactionId,
            paymentReference: transaction.paymentReference,
            status: transaction.status,
            createdAt: transaction.createdAt,
            processedAt: transaction.processedAt,
            customer: `${transaction.customer.firstName} ${transaction.customer.lastName}`,
            customerPhone: transaction.customer.phoneNumber,
            seller: `${transaction.seller.firstName} ${transaction.seller.lastName}`,
            sellerPhone: transaction.seller.phoneNumber,
        }));
        res.json({
            period: Number(period),
            currency: currency,
            transactions: formattedTransactions,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: totalTransactions,
                itemsPerPage: limitNum,
            },
        });
    }
    catch (error) {
        console.error('Error fetching external transactions details:', error);
        res.status(500).json({ error: 'Failed to fetch external transactions details' });
    }
});
router.get('/revenue/total-revenue-details', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { period = '30', page = '1', limit = '10', currency = 'GMD' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(period));
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        const allRideTransactions = await prisma.ride.findMany({
            where: {
                status: 'COMPLETED',
                paymentStatus: 'PAID',
                createdAt: { gte: startDate },
                rideRequest: {
                    currency: currency,
                },
            },
            include: {
                driver: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                rideRequest: {
                    select: {
                        currency: true,
                        currencySymbol: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const allEcommerceTransactions = await prisma.orders.findMany({
            where: {
                status: { in: ['CONFIRMED', 'COMPLETED'] },
                paymentStatus: { in: ['SETTLED', 'PAID'] },
                createdAt: { gte: startDate },
                currencyCode: currency,
            },
            include: {
                User_orders_sellerIdToUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                User_orders_userIdToUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                items: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        const [totalRides, totalOrders] = await Promise.all([
            prisma.ride.count({
                where: {
                    status: 'COMPLETED',
                    paymentStatus: 'PAID',
                    createdAt: { gte: startDate },
                    rideRequest: {
                        currency: currency,
                    },
                },
            }),
            prisma.orders.count({
                where: {
                    status: { in: ['CONFIRMED', 'COMPLETED'] },
                    paymentStatus: { in: ['SETTLED', 'PAID'] },
                    createdAt: { gte: startDate },
                    currencyCode: currency,
                },
            }),
        ]);
        const totalTransactions = totalRides + totalOrders;
        const totalPages = Math.ceil(totalTransactions / limitNum);
        const allTransactions = [
            ...allRideTransactions.map(ride => ({
                id: ride.id,
                type: 'RIDE',
                amount: ride.totalFare,
                date: ride.createdAt,
                status: ride.paymentStatus,
                driver: `${ride.driver.user.firstName} ${ride.driver.user.lastName}`,
                customer: `${ride.customer.firstName} ${ride.customer.lastName}`,
                driverPhone: ride.driver.user.phoneNumber,
                customerPhone: ride.customer.phoneNumber,
                pickupLocation: ride.pickupLocation,
                destinationLocation: ride.destinationLocation,
            })),
            ...allEcommerceTransactions.map(order => ({
                id: order.id,
                type: 'ECOMMERCE',
                amount: order.totalAmount,
                date: order.createdAt,
                status: order.paymentStatus,
                seller: `${order.User_orders_sellerIdToUser.firstName} ${order.User_orders_sellerIdToUser.lastName}`,
                customer: `${order.User_orders_userIdToUser.firstName} ${order.User_orders_userIdToUser.lastName}`,
                sellerPhone: order.User_orders_sellerIdToUser.phoneNumber,
                customerPhone: order.User_orders_userIdToUser.phoneNumber,
                productCount: order.items?.length || 0,
            })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const transactions = allTransactions.slice(skip, skip + limitNum);
        res.json({
            period: Number(period),
            currency: currency,
            transactions,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: totalTransactions,
                itemsPerPage: limitNum,
            },
        });
    }
    catch (error) {
        console.error('Error fetching revenue overview:', error);
        res.status(500).json({ error: 'Failed to fetch revenue overview' });
    }
});
router.get('/revenue/ride/inactive-drivers', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(period));
        const allDrivers = await prisma.driver.findMany({
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
            },
        });
        const activeDrivers = await prisma.ride.groupBy({
            by: ['driverId'],
            where: {
                status: 'COMPLETED',
                createdAt: { gte: startDate },
            },
        });
        const activeDriverIds = activeDrivers.map(d => d.driverId);
        const inactiveDrivers = allDrivers.filter(driver => !activeDriverIds.includes(driver.id));
        res.json({
            period: Number(period),
            totalDrivers: allDrivers.length,
            activeDrivers: activeDriverIds.length,
            inactiveDrivers: inactiveDrivers.length,
            inactiveDriversList: inactiveDrivers.map(driver => ({
                driverId: driver.driverId,
                firstName: driver.user.firstName,
                lastName: driver.user.lastName,
                phoneNumber: driver.user.phoneNumber,
                isActive: driver.isActive,
                isOnline: driver.isOnline,
                lastActive: driver.updatedAt,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching inactive drivers:', error);
        res.status(500).json({ error: 'Failed to fetch inactive drivers' });
    }
});
router.get('/revenue/ride/unpaid-rides', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { currency = 'GMD' } = req.query;
        const unpaidRides = await prisma.ride.findMany({
            where: {
                status: {
                    in: ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'],
                },
                paymentStatus: {
                    not: 'PAID',
                },
                rideRequest: {
                    currency: currency,
                },
            },
            include: {
                driver: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json({
            totalUnpaidRides: unpaidRides.length,
            unpaidRides: unpaidRides.map(ride => ({
                rideId: ride.rideId,
                status: ride.status,
                paymentStatus: ride.paymentStatus,
                totalFare: ride.totalFare,
                driverName: `${ride.driver.user.firstName} ${ride.driver.user.lastName}`,
                driverPhone: ride.driver.user.phoneNumber,
                customerName: `${ride.customer.firstName} ${ride.customer.lastName}`,
                customerPhone: ride.customer.phoneNumber,
                createdAt: ride.createdAt,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching unpaid rides:', error);
        res.status(500).json({ error: 'Failed to fetch unpaid rides' });
    }
});
router.get('/revenue/ride/unsettled-drivers', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { period = '30', currency = 'GMD' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(period));
        const driversWithPaidRides = await prisma.ride.groupBy({
            by: ['driverId'],
            where: {
                status: 'COMPLETED',
                paymentStatus: 'PAID',
                settlementStatus: {
                    not: 'SETTLED',
                },
                createdAt: { gte: startDate },
                rideRequest: {
                    currency: currency,
                },
            },
            _sum: {
                driverEarnings: true,
            },
            _count: {
                driverId: true,
            },
        });
        const unsettledDriversWithDetails = await Promise.all(driversWithPaidRides.map(async (driver) => {
            const driverDetails = await prisma.driver.findUnique({
                where: { id: driver.driverId },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            phoneNumber: true,
                        },
                    },
                },
            });
            return {
                driverId: driver.driverId,
                driverName: driverDetails ? `${driverDetails.user.firstName} ${driverDetails.user.lastName}` : 'Unknown',
                phoneNumber: driverDetails?.user.phoneNumber,
                totalEarnings: driver._sum.driverEarnings || 0,
                totalRides: driver._count.driverId,
            };
        }));
        res.json({
            period: Number(period),
            totalDriversWithPaidRides: driversWithPaidRides.length,
            unsettledDrivers: unsettledDriversWithDetails.length,
            unsettledDriversList: unsettledDriversWithDetails,
        });
    }
    catch (error) {
        console.error('Error fetching unsettled drivers:', error);
        res.status(500).json({ error: 'Failed to fetch unsettled drivers' });
    }
});
router.get('/revenue/ride/high-distance-unpaid', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { minDistance = '10', currency = 'GMD' } = req.query;
        const highDistanceUnpaidRides = await prisma.ride.findMany({
            where: {
                distance: {
                    gte: Number(minDistance),
                },
                paymentStatus: {
                    not: 'PAID',
                },
                status: 'COMPLETED',
                rideRequest: {
                    currency: currency,
                },
            },
            include: {
                driver: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
            },
            orderBy: {
                distance: 'desc',
            },
        });
        res.json({
            minDistance: Number(minDistance),
            totalRides: highDistanceUnpaidRides.length,
            rides: highDistanceUnpaidRides.map(ride => ({
                rideId: ride.rideId,
                distance: ride.distance,
                totalFare: ride.totalFare,
                status: ride.status,
                paymentStatus: ride.paymentStatus,
                driverName: `${ride.driver.user.firstName} ${ride.driver.user.lastName}`,
                driverPhone: ride.driver.user.phoneNumber,
                customerName: `${ride.customer.firstName} ${ride.customer.lastName}`,
                customerPhone: ride.customer.phoneNumber,
                completedAt: ride.completedAt,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching high distance unpaid rides:', error);
        res.status(500).json({ error: 'Failed to fetch high distance unpaid rides' });
    }
});
router.get('/revenue/ride/repeat-customers', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { date, currency = 'GMD' } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);
        const ridesForDate = await prisma.ride.findMany({
            where: {
                createdAt: {
                    gte: targetDate,
                    lt: nextDate,
                },
                status: 'COMPLETED',
                rideRequest: {
                    currency: currency,
                },
            },
            include: {
                driver: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
            },
        });
        const driverCustomerPairs = ridesForDate.reduce((acc, ride) => {
            const key = `${ride.driverId}-${ride.customerId}`;
            if (!acc[key]) {
                acc[key] = {
                    driverId: ride.driverId,
                    customerId: ride.customerId,
                    driverName: `${ride.driver.user.firstName} ${ride.driver.user.lastName}`,
                    driverPhone: ride.driver.user.phoneNumber,
                    customerName: `${ride.customer.firstName} ${ride.customer.lastName}`,
                    customerPhone: ride.customer.phoneNumber,
                    rides: [],
                };
            }
            acc[key].rides.push({
                rideId: ride.rideId,
                totalFare: ride.totalFare,
                createdAt: ride.createdAt,
            });
            return acc;
        }, {});
        const repeatCustomers = Object.values(driverCustomerPairs).filter((pair) => pair.rides.length > 1);
        res.json({
            date: targetDate.toISOString().split('T')[0],
            totalRides: ridesForDate.length,
            repeatCustomerPairs: repeatCustomers.length,
            repeatCustomers: repeatCustomers.map((pair) => ({
                driverId: pair.driverId,
                customerId: pair.customerId,
                driverName: pair.driverName,
                driverPhone: pair.driverPhone,
                customerName: pair.customerName,
                customerPhone: pair.customerPhone,
                rideCount: pair.rides.length,
                totalFare: pair.rides.reduce((sum, ride) => {
                    const fare = Number(ride.totalFare) || 0;
                    return sum + fare;
                }, 0),
                rides: pair.rides,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching repeat customers:', error);
        res.status(500).json({ error: 'Failed to fetch repeat customers' });
    }
});
router.get('/revenue/ride/no-token-rides', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { currency = 'GMD' } = req.query;
        const ridesWithoutToken = await prisma.ride.findMany({
            where: {
                status: 'ACCEPTED',
                rideRequest: {
                    currency: currency,
                },
                OR: [
                    {
                        rideToken: null,
                    },
                    {
                        rideToken: {
                            isUsed: false,
                        },
                    },
                ],
            },
            include: {
                driver: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                rideToken: {
                    select: {
                        isUsed: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json({
            totalRidesWithoutToken: ridesWithoutToken.length,
            ridesWithoutToken: ridesWithoutToken.map(ride => ({
                rideId: ride.rideId,
                status: ride.status,
                totalFare: ride.totalFare,
                driverName: `${ride.driver.user.firstName} ${ride.driver.user.lastName}`,
                driverPhone: ride.driver.user.phoneNumber,
                customerName: `${ride.customer.firstName} ${ride.customer.lastName}`,
                customerPhone: ride.customer.phoneNumber,
                createdAt: ride.createdAt,
                hasToken: ride.rideToken !== null,
                tokenUsed: ride.rideToken?.isUsed || false,
                tokenStatus: ride.rideToken ? (ride.rideToken.isUsed ? 'USED' : 'UNUSED') : 'NO_TOKEN',
            })),
        });
    }
    catch (error) {
        console.error('Error fetching rides without token:', error);
        res.status(500).json({ error: 'Failed to fetch rides without token' });
    }
});
router.get('/revenue/ecommerce/unpaid-orders', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { currency = 'GMD' } = req.query;
        const unpaidOrders = await prisma.orders.findMany({
            where: {
                status: {
                    not: 'CANCELLED',
                },
                paymentStatus: 'PENDING',
                currencyCode: currency,
            },
            include: {
                User_orders_userIdToUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                User_orders_sellerIdToUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                items: {
                    include: {
                        product: {
                            select: {
                                title: true,
                                price: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json({
            totalUnpaidOrders: unpaidOrders.length,
            totalUnpaidAmount: unpaidOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
            orders: unpaidOrders.map(order => ({
                orderId: order.orderNumber,
                totalAmount: Number(order.totalAmount),
                paymentStatus: order.paymentStatus,
                status: order.status,
                customerName: `${order.User_orders_userIdToUser.firstName} ${order.User_orders_userIdToUser.lastName}`,
                customerPhone: order.User_orders_userIdToUser.phoneNumber,
                sellerName: order.User_orders_sellerIdToUser ? `${order.User_orders_sellerIdToUser.firstName} ${order.User_orders_sellerIdToUser.lastName}` : 'N/A',
                sellerPhone: order.User_orders_sellerIdToUser?.phoneNumber,
                items: order.items.map(item => ({
                    productName: item.product.title,
                    quantity: item.quantity,
                    price: Number(item.unitPrice),
                    total: Number(item.totalPrice),
                })),
                createdAt: order.createdAt,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching unpaid orders:', error);
        res.status(500).json({ error: 'Failed to fetch unpaid orders' });
    }
});
router.get('/revenue/ecommerce/sellers-no-orders', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(period));
        const allSellers = await prisma.user.findMany({
            where: {
                sellerKyc: {
                    isNot: null,
                },
            },
            include: {
                products: true,
                sellerKyc: true,
            },
        });
        const sellersWithOrders = await prisma.orders.groupBy({
            by: ['sellerId'],
            where: {
                createdAt: { gte: startDate },
            },
        });
        const sellersWithOrderIds = sellersWithOrders.map(s => s.sellerId);
        const sellersWithoutOrders = allSellers.filter(seller => !sellersWithOrderIds.includes(seller.id));
        res.json({
            period: Number(period),
            totalSellers: allSellers.length,
            sellersWithOrders: sellersWithOrderIds.length,
            sellersWithoutOrders: sellersWithoutOrders.length,
            sellersWithoutOrdersList: sellersWithoutOrders.map(seller => ({
                sellerId: seller.id,
                firstName: seller.firstName,
                lastName: seller.lastName,
                phoneNumber: seller.phoneNumber,
                productCount: seller.products.length,
                products: seller.products.map(product => ({
                    productId: product.id,
                    title: product.title,
                    price: Number(product.price),
                    status: product.status,
                })),
                lastActive: seller.updatedAt,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching sellers without orders:', error);
        res.status(500).json({ error: 'Failed to fetch sellers without orders' });
    }
});
router.get('/revenue/ecommerce/sellers-unsettled', auth_1.authenticate, (0, permissions_1.requirePermission)('ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { period = '30', currency = 'GMD' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(period));
        const sellersWithPaidOrders = await prisma.orders.groupBy({
            by: ['sellerId'],
            where: {
                status: 'COMPLETED',
                paymentStatus: 'PAID',
                currencyCode: currency,
                createdAt: { gte: startDate },
            },
            _sum: {
                totalAmount: true,
            },
            _count: {
                sellerId: true,
            },
        });
        const settlementRequests = await prisma.settlement.findMany({
            where: {
                createdAt: { gte: startDate },
                channel: 'ECOMMERCE',
                currency: currency,
            },
            select: {
                userId: true,
                status: true,
            },
        });
        const sellerSettlements = settlementRequests.reduce((acc, settlement) => {
            if (!acc[settlement.userId]) {
                acc[settlement.userId] = [];
            }
            acc[settlement.userId].push(settlement.status);
            return acc;
        }, {});
        const unsettledSellers = sellersWithPaidOrders.map(seller => {
            const sellerSettlementStatuses = sellerSettlements[seller.sellerId] || [];
            const hasCompletedSettlement = sellerSettlementStatuses.includes('COMPLETED');
            if (sellerSettlementStatuses.length === 0) {
                return {
                    ...seller,
                    settlementStatus: 'NO_SETTLEMENT_REQUEST',
                    settlementMessage: 'No settlement request',
                };
            }
            if (!hasCompletedSettlement) {
                const currentStatus = sellerSettlementStatuses[sellerSettlementStatuses.length - 1];
                return {
                    ...seller,
                    settlementStatus: 'WAITING',
                    settlementMessage: `Waiting: ${currentStatus}`,
                };
            }
            return null;
        }).filter(seller => seller !== null);
        const unsettledSellersWithDetails = await Promise.all(unsettledSellers.map(async (seller) => {
            const sellerDetails = await prisma.user.findUnique({
                where: { id: seller.sellerId },
                select: {
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                },
            });
            return {
                sellerId: seller.sellerId,
                sellerName: sellerDetails ? `${sellerDetails.firstName} ${sellerDetails.lastName}` : 'Unknown',
                phoneNumber: sellerDetails?.phoneNumber,
                totalAmount: Number(seller._sum.totalAmount || 0),
                totalOrders: seller._count.sellerId,
                settlementStatus: seller.settlementStatus,
                settlementMessage: seller.settlementMessage,
            };
        }));
        res.json({
            period: Number(period),
            totalSellersWithPaidOrders: sellersWithPaidOrders.length,
            unsettledSellers: unsettledSellersWithDetails.length,
            unsettledSellersList: unsettledSellersWithDetails,
        });
    }
    catch (error) {
        console.error('Error fetching unsettled sellers:', error);
        res.status(500).json({ error: 'Failed to fetch unsettled sellers' });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map