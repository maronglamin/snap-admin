"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const permissions_1 = require("../middleware/permissions");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get('/kpis', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_SERVICE_TIERS', 'VIEW'), async (req, res) => {
    try {
        const rideServices = await prisma.rideService.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                vehicleType: true,
                isActive: true,
            },
            orderBy: { name: 'asc' }
        });
        const kpiData = await Promise.all(rideServices.map(async (service) => {
            const totalDrivers = await prisma.driver.count({
                where: { rideServiceId: service.id }
            });
            const onlineDrivers = await prisma.driver.count({
                where: {
                    rideServiceId: service.id,
                    status: 'ONLINE'
                }
            });
            const offlineDrivers = await prisma.driver.count({
                where: {
                    rideServiceId: service.id,
                    status: 'OFFLINE'
                }
            });
            const busyDrivers = await prisma.driver.count({
                where: {
                    rideServiceId: service.id,
                    status: 'BUSY'
                }
            });
            return {
                serviceId: service.id,
                serviceName: service.name,
                vehicleType: service.vehicleType,
                totalDrivers,
                onlineDrivers,
                offlineDrivers,
                busyDrivers,
            };
        }));
        const totalDrivers = await prisma.driver.count();
        const totalOnlineDrivers = await prisma.driver.count({ where: { status: 'ONLINE' } });
        const totalOfflineDrivers = await prisma.driver.count({ where: { status: 'OFFLINE' } });
        const totalBusyDrivers = await prisma.driver.count({ where: { status: 'BUSY' } });
        const totalAssignedDrivers = await prisma.driver.count({ where: { rideServiceId: { not: null } } });
        const totalUnassignedDrivers = await prisma.driver.count({ where: { rideServiceId: null } });
        const overallKPIs = {
            totalDrivers,
            totalOnlineDrivers,
            totalOfflineDrivers,
            totalBusyDrivers,
            totalAssignedDrivers,
            totalUnassignedDrivers,
        };
        res.json({
            success: true,
            data: {
                overallKPIs,
                serviceKPIs: kpiData
            }
        });
    }
    catch (error) {
        console.error('Error fetching KPI data:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_SERVICE_TIERS', 'VIEW'), async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', rideServiceId = 'all', status = 'all', driverStatus = 'all' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (search && search !== '') {
            where.OR = [
                { user: { firstName: { contains: search, mode: 'insensitive' } } },
                { user: { lastName: { contains: search, mode: 'insensitive' } } },
                { driverId: { contains: search, mode: 'insensitive' } },
                { rideService: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (rideServiceId && rideServiceId !== 'all') {
            where.rideServiceId = rideServiceId;
        }
        if (driverStatus && driverStatus !== 'all') {
            where.status = driverStatus;
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        const total = await prisma.driver.count({ where });
        const totalPages = Math.ceil(total / limitNum);
        const drivers = await prisma.driver.findMany({
            where,
            skip,
            take: limitNum,
            select: {
                id: true,
                driverId: true,
                status: true,
                isOnline: true,
                isVerified: true,
                isActive: true,
                updatedBy: true,
                updatedAt: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    }
                },
                rideService: {
                    select: {
                        id: true,
                        name: true,
                        vehicleType: true,
                        isActive: true,
                    }
                },
                riderApplication: {
                    select: {
                        id: true,
                        status: true,
                        vehicleType: true,
                        vehicleModel: true,
                        vehiclePlate: true,
                    }
                },
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: drivers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
            }
        });
    }
    catch (error) {
        console.error('Error fetching ride service tiers:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/available-ride-services', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_SERVICE_TIERS', 'VIEW'), async (req, res) => {
    try {
        const rideServices = await prisma.rideService.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                vehicleType: true,
                description: true,
                isDefault: true,
            },
            orderBy: { name: 'asc' }
        });
        res.json({
            success: true,
            data: rideServices
        });
    }
    catch (error) {
        console.error('Error fetching available ride services:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.put('/:driverId/assign', [
    auth_1.authenticate,
    (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_SERVICE_TIERS', 'EDIT'),
    (0, express_validator_1.body)('rideServiceId').notEmpty().withMessage('Ride service ID is required'),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg,
            });
        }
        const { driverId } = req.params;
        const { rideServiceId } = req.body;
        const adminUser = req.user;
        if (!adminUser || !adminUser.username) {
            return res.status(401).json({
                success: false,
                error: 'Admin user not authenticated',
            });
        }
        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    }
                },
                rideService: {
                    select: {
                        name: true,
                    }
                },
            }
        });
        if (!driver) {
            return res.status(404).json({
                success: false,
                error: 'Driver not found',
            });
        }
        const rideService = await prisma.rideService.findUnique({
            where: { id: rideServiceId }
        });
        if (!rideService) {
            return res.status(404).json({
                success: false,
                error: 'Ride service not found',
            });
        }
        const updatedDriver = await prisma.driver.update({
            where: { id: driverId },
            data: {
                rideServiceId,
                updatedBy: adminUser.username,
            },
            select: {
                id: true,
                driverId: true,
                status: true,
                isOnline: true,
                isVerified: true,
                isActive: true,
                updatedBy: true,
                updatedAt: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    }
                },
                rideService: {
                    select: {
                        id: true,
                        name: true,
                        vehicleType: true,
                        isActive: true,
                    }
                },
                riderApplication: {
                    select: {
                        id: true,
                        status: true,
                        vehicleType: true,
                        vehicleModel: true,
                        vehiclePlate: true,
                    }
                },
            }
        });
        res.json({
            success: true,
            data: updatedDriver,
            message: `Driver ${driver.user.firstName} ${driver.user.lastName} has been assigned to ${rideService.name}`,
        });
    }
    catch (error) {
        console.error('Error assigning driver to ride service:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.put('/:driverId/unassign', [
    auth_1.authenticate,
    (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_SERVICE_TIERS', 'EDIT'),
], async (req, res) => {
    try {
        const { driverId } = req.params;
        const adminUser = req.user;
        if (!adminUser || !adminUser.username) {
            return res.status(401).json({
                success: false,
                error: 'Admin user not authenticated',
            });
        }
        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    }
                },
                rideService: {
                    select: {
                        name: true,
                    }
                },
            }
        });
        if (!driver) {
            return res.status(404).json({
                success: false,
                error: 'Driver not found',
            });
        }
        if (!driver.rideServiceId) {
            return res.status(400).json({
                success: false,
                error: 'Driver is not assigned to any ride service',
            });
        }
        const updatedDriver = await prisma.driver.update({
            where: { id: driverId },
            data: {
                rideServiceId: null,
                updatedBy: adminUser.username,
            },
            select: {
                id: true,
                driverId: true,
                status: true,
                isOnline: true,
                isVerified: true,
                isActive: true,
                updatedBy: true,
                updatedAt: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    }
                },
                rideService: {
                    select: {
                        id: true,
                        name: true,
                        vehicleType: true,
                        isActive: true,
                    }
                },
                riderApplication: {
                    select: {
                        id: true,
                        status: true,
                        vehicleType: true,
                        vehicleModel: true,
                        vehiclePlate: true,
                    }
                },
            }
        });
        res.json({
            success: true,
            data: updatedDriver,
            message: `Driver ${driver.user.firstName} ${driver.user.lastName} has been unassigned from ${driver.rideService?.name}`,
        });
    }
    catch (error) {
        console.error('Error unassigning driver from ride service:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/:driverId/performance', [
    auth_1.authenticate,
    (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_SERVICE_TIERS', 'VIEW'),
], async (req, res) => {
    try {
        const { driverId } = req.params;
        const { dateFilter = 'all' } = req.query;
        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            select: {
                id: true,
                userId: true,
                user: {
                    select: {
                        id: true,
                    }
                },
            }
        });
        if (!driver) {
            return res.status(404).json({
                success: false,
                error: 'Driver not found',
            });
        }
        const now = new Date();
        let startDate;
        let endDate;
        switch (dateFilter) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            default:
                startDate = undefined;
                endDate = undefined;
        }
        const dateFilterCondition = startDate && endDate ? {
            createdAt: {
                gte: startDate,
                lte: endDate,
            }
        } : {};
        const rideCompletionFilter = startDate && endDate ? {
            completedAt: {
                gte: startDate,
                lte: endDate,
            }
        } : {};
        const rides = await prisma.ride.findMany({
            where: {
                driverId: driver.id,
                status: {
                    in: ['COMPLETED']
                },
                ...rideCompletionFilter,
            },
            select: {
                id: true,
                totalFare: true,
                driverEarnings: true,
                customerRating: true,
                status: true,
                completedAt: true,
            }
        });
        const settlements = await prisma.settlement.findMany({
            where: {
                userId: driver.userId,
                channel: 'RIDES',
                ...dateFilterCondition,
            },
            select: {
                id: true,
                status: true,
                amount: true,
                type: true,
                channel: true,
            }
        });
        const totalRides = rides.length;
        const totalEarnings = rides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0);
        const ratedRides = rides.filter(ride => ride.customerRating !== null);
        const averageRating = ratedRides.length > 0
            ? ratedRides.reduce((sum, ride) => sum + (ride.customerRating || 0), 0) / ratedRides.length
            : 0;
        const settlementKPIs = {
            paid: settlements.filter(s => s.status === 'COMPLETED').length,
            pending: settlements.filter(s => s.status === 'PENDING').length,
            processing: settlements.filter(s => s.status === 'PROCESSING').length,
        };
        const performanceMetrics = {
            totalRides,
            totalEarnings,
            rating: averageRating,
            ratingCount: ratedRides.length,
            settlements: settlementKPIs,
        };
        console.log(`Performance metrics for driver ${driverId}:`, {
            dateFilter,
            ridesFound: rides.length,
            settlementsFound: settlements.length,
            totalRides,
            totalEarnings,
            averageRating,
            settlementKPIs,
        });
        res.json({
            success: true,
            data: performanceMetrics,
            message: "Settlement records are for ride service only",
        });
    }
    catch (error) {
        console.error('Error getting driver performance metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.put('/:driverId/status', [
    auth_1.authenticate,
    (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_SERVICE_TIERS', 'EDIT'),
], async (req, res) => {
    try {
        const { driverId } = req.params;
        const { status } = req.body;
        const adminUser = req.user;
        if (!adminUser || !adminUser.username) {
            return res.status(401).json({
                success: false,
                error: 'Admin user not authenticated',
            });
        }
        if (!status || !['ONLINE', 'OFFLINE', 'BUSY'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Valid status is required (ONLINE, OFFLINE, BUSY)',
            });
        }
        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    }
                },
            }
        });
        if (!driver) {
            return res.status(404).json({
                success: false,
                error: 'Driver not found',
            });
        }
        const updatedDriver = await prisma.driver.update({
            where: { id: driverId },
            data: {
                status: status,
                isOnline: status === 'ONLINE',
                updatedBy: adminUser.username,
            },
            select: {
                id: true,
                driverId: true,
                status: true,
                isOnline: true,
                isVerified: true,
                isActive: true,
                updatedBy: true,
                updatedAt: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    }
                },
                rideService: {
                    select: {
                        id: true,
                        name: true,
                        vehicleType: true,
                        isActive: true,
                    }
                },
                riderApplication: {
                    select: {
                        id: true,
                        status: true,
                        vehicleType: true,
                        vehicleModel: true,
                        vehiclePlate: true,
                    }
                },
            }
        });
        res.json({
            success: true,
            data: updatedDriver,
            message: `Driver ${driver.user.firstName} ${driver.user.lastName} status updated to ${status}`,
        });
    }
    catch (error) {
        console.error('Error updating driver status:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=ride-service-tiers.js.map