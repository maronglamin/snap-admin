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
router.get('/', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req, res) => {
    try {
        const { page = 1, limit = 10, status, rideType, paymentStatus, search, startDate, endDate } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (status) {
            where.status = status;
        }
        if (rideType) {
            where.rideType = rideType;
        }
        if (paymentStatus) {
            where.paymentStatus = paymentStatus;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                where.createdAt.lte = endDateTime;
            }
        }
        if (search) {
            where.OR = [
                { rideId: { contains: search, mode: 'insensitive' } },
                { customer: { firstName: { contains: search, mode: 'insensitive' } } },
                { customer: { lastName: { contains: search, mode: 'insensitive' } } },
                { customer: { phoneNumber: { contains: search, mode: 'insensitive' } } },
                { driver: { driverId: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [rides, total] = await Promise.all([
            prisma.ride.findMany({
                where,
                include: {
                    customer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phoneNumber: true,
                        },
                    },
                    driver: {
                        select: {
                            id: true,
                            driverId: true,
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },
                    rideRequest: {
                        select: {
                            id: true,
                            requestId: true,
                            requestedAt: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit),
            }),
            prisma.ride.count({ where }),
        ]);
        res.json({
            rides,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Error fetching rides:', error);
        res.status(500).json({ error: 'Failed to fetch rides' });
    }
});
router.get('/export', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_MANAGEMENT', 'EXPORT'), async (req, res) => {
    try {
        const { status, rideType, paymentStatus, search, startDate, endDate } = req.query;
        const where = {};
        if (status) {
            where.status = status;
        }
        if (rideType) {
            where.rideType = rideType;
        }
        if (paymentStatus) {
            where.paymentStatus = paymentStatus;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                where.createdAt.lte = endDateTime;
            }
        }
        if (search) {
            where.OR = [
                { rideId: { contains: search, mode: 'insensitive' } },
                { customer: { firstName: { contains: search, mode: 'insensitive' } } },
                { customer: { lastName: { contains: search, mode: 'insensitive' } } },
                { customer: { phoneNumber: { contains: search, mode: 'insensitive' } } },
                { driver: { driverId: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const rides = await prisma.ride.findMany({
            where,
            include: {
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                driver: {
                    select: {
                        id: true,
                        driverId: true,
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
                rideRequest: {
                    select: {
                        id: true,
                        requestId: true,
                        requestedAt: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const csvHeaders = [
            'Ride ID',
            'Status',
            'Ride Type',
            'Total Fare',
            'Driver Earnings',
            'Platform Fee',
            'Payment Method',
            'Payment Status',
            'Customer Name',
            'Customer Phone',
            'Driver ID',
            'Driver Name',
            'Driver Phone',
            'Request ID',
            'Requested At',
            'Started At',
            'Completed At',
            'Created At',
        ];
        const csvRows = rides.map(ride => [
            ride.rideId,
            ride.status,
            ride.rideType,
            ride.totalFare.toString(),
            ride.driverEarnings.toString(),
            ride.platformFee.toString(),
            ride.paymentMethod,
            ride.paymentStatus,
            `${ride.customer.firstName} ${ride.customer.lastName}`,
            ride.customer.phoneNumber,
            ride.driver.driverId,
            `${ride.driver.user.firstName} ${ride.driver.user.lastName}`,
            ride.driver.user.phoneNumber,
            ride.rideRequest.requestId,
            ride.rideRequest.requestedAt,
            ride.startedAt || '',
            ride.completedAt || '',
            ride.createdAt,
        ]);
        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="ride-management-export-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
    }
    catch (error) {
        console.error('Error exporting rides:', error);
        res.status(500).json({ error: 'Failed to export rides' });
    }
});
router.get('/:id', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req, res) => {
    try {
        const { id } = req.params;
        const ride = await prisma.ride.findUnique({
            where: { id },
            include: {
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                driver: {
                    select: {
                        id: true,
                        driverId: true,
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
                rideRequest: {
                    select: {
                        id: true,
                        requestId: true,
                        requestedAt: true,
                        expiresAt: true,
                    },
                },
                locationUpdates: {
                    select: {
                        id: true,
                        latitude: true,
                        longitude: true,
                        accuracy: true,
                        speed: true,
                        heading: true,
                        timestamp: true,
                    },
                    orderBy: { timestamp: 'asc' },
                },
            },
        });
        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }
        res.json(ride);
    }
    catch (error) {
        console.error('Error fetching ride:', error);
        res.status(500).json({ error: 'Failed to fetch ride' });
    }
});
router.get('/stats/overview', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req, res) => {
    try {
        const [totalRides, completedRides, cancelledRides, totalRevenue, totalDriverEarnings, totalPlatformFees, todayRides, thisWeekRides, thisMonthRides,] = await Promise.all([
            prisma.ride.count(),
            prisma.ride.count({ where: { status: 'COMPLETED' } }),
            prisma.ride.count({ where: { status: 'CANCELLED' } }),
            prisma.ride.aggregate({
                where: { status: 'COMPLETED' },
                _sum: { totalFare: true },
            }),
            prisma.ride.aggregate({
                where: { status: 'COMPLETED' },
                _sum: { driverEarnings: true },
            }),
            prisma.ride.aggregate({
                where: { status: 'COMPLETED' },
                _sum: { platformFee: true },
            }),
            prisma.ride.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
            prisma.ride.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setDate(new Date().getDate() - 7)),
                    },
                },
            }),
            prisma.ride.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
        ]);
        res.json({
            totalRides,
            completedRides,
            cancelledRides,
            cancellationRate: totalRides > 0 ? (cancelledRides / totalRides) * 100 : 0,
            totalRevenue: totalRevenue._sum.totalFare || 0,
            totalDriverEarnings: totalDriverEarnings._sum.driverEarnings || 0,
            totalPlatformFees: totalPlatformFees._sum.platformFee || 0,
            todayRides,
            thisWeekRides,
            thisMonthRides,
        });
    }
    catch (error) {
        console.error('Error fetching ride statistics:', error);
        res.status(500).json({ error: 'Failed to fetch ride statistics' });
    }
});
router.get('/stats/by-status', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req, res) => {
    try {
        const statusCounts = await prisma.ride.groupBy({
            by: ['status'],
            _count: {
                status: true,
            },
        });
        const statusData = statusCounts.map(item => ({
            status: item.status,
            count: item._count.status,
        }));
        res.json(statusData);
    }
    catch (error) {
        console.error('Error fetching status statistics:', error);
        res.status(500).json({ error: 'Failed to fetch status statistics' });
    }
});
router.get('/stats/by-type', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req, res) => {
    try {
        const typeCounts = await prisma.ride.groupBy({
            by: ['rideType'],
            _count: {
                rideType: true,
            },
        });
        const typeData = typeCounts.map(item => ({
            rideType: item.rideType,
            count: item._count.rideType,
        }));
        res.json(typeData);
    }
    catch (error) {
        console.error('Error fetching type statistics:', error);
        res.status(500).json({ error: 'Failed to fetch type statistics' });
    }
});
router.get('/stats/by-payment-method', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req, res) => {
    try {
        const paymentMethodCounts = await prisma.ride.groupBy({
            by: ['paymentMethod'],
            _count: {
                paymentMethod: true,
            },
        });
        const paymentMethodData = paymentMethodCounts.map(item => ({
            paymentMethod: item.paymentMethod,
            count: item._count.paymentMethod,
        }));
        res.json(paymentMethodData);
    }
    catch (error) {
        console.error('Error fetching payment method statistics:', error);
        res.status(500).json({ error: 'Failed to fetch payment method statistics' });
    }
});
router.get('/stats/revenue', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(period));
        const [totalRevenue, driverEarnings, platformFees, revenueByDay, averageFare, averageDriverEarnings,] = await Promise.all([
            prisma.ride.aggregate({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate },
                },
                _sum: { totalFare: true },
            }),
            prisma.ride.aggregate({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate },
                },
                _sum: { driverEarnings: true },
            }),
            prisma.ride.aggregate({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate },
                },
                _sum: { platformFee: true },
            }),
            prisma.ride.groupBy({
                by: ['createdAt'],
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate },
                },
                _sum: {
                    totalFare: true,
                    driverEarnings: true,
                    platformFee: true,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            }),
            prisma.ride.aggregate({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate },
                },
                _avg: { totalFare: true },
            }),
            prisma.ride.aggregate({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate },
                },
                _avg: { driverEarnings: true },
            }),
        ]);
        res.json({
            period: Number(period),
            totalRevenue: totalRevenue._sum.totalFare || 0,
            driverEarnings: driverEarnings._sum.driverEarnings || 0,
            platformFees: platformFees._sum.platformFee || 0,
            averageFare: averageFare._avg.totalFare || 0,
            averageDriverEarnings: averageDriverEarnings._avg.driverEarnings || 0,
            revenueByDay: revenueByDay.map(item => ({
                date: item.createdAt,
                totalFare: item._sum.totalFare || 0,
                driverEarnings: item._sum.driverEarnings || 0,
                platformFee: item._sum.platformFee || 0,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching revenue analytics:', error);
        res.status(500).json({ error: 'Failed to fetch revenue analytics' });
    }
});
exports.default = router;
//# sourceMappingURL=ride-management.js.map