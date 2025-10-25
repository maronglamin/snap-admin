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
router.get('/dashboard', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thisWeek = new Date();
        thisWeek.setDate(thisWeek.getDate() - 7);
        const thisMonth = new Date();
        thisMonth.setMonth(thisMonth.getMonth() - 1);
        const [totalRides, totalDrivers, totalCustomers, totalRevenue, todayRides, todayRevenue, thisWeekRides, thisWeekRevenue, thisMonthRides, thisMonthRevenue, activeDrivers, onlineDrivers, pendingApplications, completedRidesToday, cancelledRidesToday,] = await Promise.all([
            prisma.ride.count(),
            prisma.driver.count(),
            prisma.ride.groupBy({
                by: ['customerId'],
                _count: { customerId: true },
            }).then(result => result.length),
            prisma.ride.aggregate({
                where: { status: 'COMPLETED' },
                _sum: { totalFare: true },
            }),
            prisma.ride.count({
                where: { createdAt: { gte: today } },
            }),
            prisma.ride.aggregate({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: today }
                },
                _sum: { totalFare: true },
            }),
            prisma.ride.count({
                where: { createdAt: { gte: thisWeek } },
            }),
            prisma.ride.aggregate({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: thisWeek }
                },
                _sum: { totalFare: true },
            }),
            prisma.ride.count({
                where: { createdAt: { gte: thisMonth } },
            }),
            prisma.ride.aggregate({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: thisMonth }
                },
                _sum: { totalFare: true },
            }),
            prisma.driver.count({ where: { isActive: true } }),
            prisma.driver.count({ where: { isOnline: true } }),
            prisma.riderApplication.count({ where: { status: 'PENDING' } }),
            prisma.ride.count({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: today }
                },
            }),
            prisma.ride.count({
                where: {
                    status: 'CANCELLED',
                    createdAt: { gte: today }
                },
            }),
        ]);
        res.json({
            overview: {
                totalRides,
                totalDrivers,
                totalCustomers,
                totalRevenue: totalRevenue._sum.totalFare || 0,
                activeDrivers,
                onlineDrivers,
                pendingApplications,
            },
            today: {
                rides: todayRides,
                revenue: todayRevenue._sum.totalFare || 0,
                completedRides: completedRidesToday,
                cancelledRides: cancelledRidesToday,
                completionRate: todayRides > 0 ? (completedRidesToday / todayRides) * 100 : 0,
            },
            thisWeek: {
                rides: thisWeekRides,
                revenue: thisWeekRevenue._sum.totalFare || 0,
            },
            thisMonth: {
                rides: thisMonthRides,
                revenue: thisMonthRevenue._sum.totalFare || 0,
            },
        });
    }
    catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});
router.get('/revenue', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(period));
        const [totalRevenue, driverEarnings, platformFees, revenueByDay, revenueByRideType, revenueByPaymentMethod, averageFare, averageDriverEarnings, topDrivers,] = await Promise.all([
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
                orderBy: { createdAt: 'asc' },
            }),
            prisma.ride.groupBy({
                by: ['rideType'],
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate },
                },
                _sum: { totalFare: true },
                _count: { rideType: true },
            }),
            prisma.ride.groupBy({
                by: ['paymentMethod'],
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate },
                },
                _sum: { totalFare: true },
                _count: { paymentMethod: true },
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
            prisma.ride.groupBy({
                by: ['driverId'],
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate },
                },
                _sum: { driverEarnings: true },
                _count: { driverId: true },
                orderBy: { _sum: { driverEarnings: 'desc' } },
                take: 10,
            }),
        ]);
        const topDriversWithDetails = await Promise.all(topDrivers.map(async (driver) => {
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
            summary: {
                totalRevenue: totalRevenue._sum.totalFare || 0,
                driverEarnings: driverEarnings._sum.driverEarnings || 0,
                platformFees: platformFees._sum.platformFee || 0,
                averageFare: averageFare._avg.totalFare || 0,
                averageDriverEarnings: averageDriverEarnings._avg.driverEarnings || 0,
            },
            revenueByDay: revenueByDay.map(item => ({
                date: item.createdAt,
                totalFare: item._sum.totalFare || 0,
                driverEarnings: item._sum.driverEarnings || 0,
                platformFee: item._sum.platformFee || 0,
            })),
            revenueByRideType: revenueByRideType.map(item => ({
                rideType: item.rideType,
                revenue: item._sum.totalFare || 0,
                count: item._count.rideType,
            })),
            revenueByPaymentMethod: revenueByPaymentMethod.map(item => ({
                paymentMethod: item.paymentMethod,
                revenue: item._sum.totalFare || 0,
                count: item._count.paymentMethod,
            })),
            topDrivers: topDriversWithDetails,
        });
    }
    catch (error) {
        console.error('Error fetching revenue analytics:', error);
        res.status(500).json({ error: 'Failed to fetch revenue analytics' });
    }
});
router.get('/performance', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_ANALYTICS', 'VIEW'), async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(period));
        const [totalRides, completedRides, cancelledRides, averageRating, averageResponseTime, averageRideDuration, averageDistance, ridesByStatus, ridesByType, performanceByDriver,] = await Promise.all([
            prisma.ride.count({
                where: { createdAt: { gte: startDate } },
            }),
            prisma.ride.count({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate }
                },
            }),
            prisma.ride.count({
                where: {
                    status: 'CANCELLED',
                    createdAt: { gte: startDate }
                },
            }),
            prisma.ride.aggregate({
                where: {
                    status: 'COMPLETED',
                    customerRating: { not: null },
                    createdAt: { gte: startDate },
                },
                _avg: { customerRating: true },
            }),
            prisma.ride.aggregate({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate },
                },
                _avg: {},
            }),
            prisma.ride.aggregate({
                where: {
                    status: 'COMPLETED',
                    duration: { not: null },
                    createdAt: { gte: startDate },
                },
                _avg: { duration: true },
            }),
            prisma.ride.aggregate({
                where: {
                    status: 'COMPLETED',
                    distance: { not: null },
                    createdAt: { gte: startDate },
                },
                _avg: { distance: true },
            }),
            prisma.ride.groupBy({
                by: ['status'],
                where: { createdAt: { gte: startDate } },
                _count: { status: true },
            }),
            prisma.ride.groupBy({
                by: ['rideType'],
                where: { createdAt: { gte: startDate } },
                _count: { rideType: true },
            }),
            prisma.ride.groupBy({
                by: ['driverId'],
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate },
                },
                _count: { driverId: true },
                _avg: { customerRating: true },
                _sum: { driverEarnings: true },
                orderBy: { _count: { driverId: 'desc' } },
                take: 10,
            }),
        ]);
        const performanceByDriverWithDetails = await Promise.all(performanceByDriver.map(async (driver) => {
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
                totalRides: driver._count.driverId,
                averageRating: driver._avg.customerRating || 0,
                totalEarnings: driver._sum.driverEarnings || 0,
            };
        }));
        res.json({
            period: Number(period),
            summary: {
                totalRides,
                completedRides,
                cancelledRides,
                completionRate: totalRides > 0 ? (completedRides / totalRides) * 100 : 0,
                cancellationRate: totalRides > 0 ? (cancelledRides / totalRides) * 100 : 0,
                averageRating: averageRating._avg.customerRating || 0,
                averageRideDuration: averageRideDuration._avg.duration || 0,
                averageDistance: averageDistance._avg.distance || 0,
            },
            ridesByStatus: ridesByStatus.map(item => ({
                status: item.status,
                count: item._count.status,
                percentage: totalRides > 0 ? (item._count.status / totalRides) * 100 : 0,
            })),
            ridesByType: ridesByType.map(item => ({
                rideType: item.rideType,
                count: item._count.rideType,
                percentage: totalRides > 0 ? (item._count.rideType / totalRides) * 100 : 0,
            })),
            performanceByDriver: performanceByDriverWithDetails,
        });
    }
    catch (error) {
        console.error('Error fetching performance metrics:', error);
        res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
});
exports.default = router;
//# sourceMappingURL=ride-analytics.js.map