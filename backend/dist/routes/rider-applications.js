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
router.get('/', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDER_APPLICATIONS', 'VIEW'), async (req, res) => {
    try {
        const { page = 1, limit = 10, status, vehicleType, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (status) {
            where.status = status;
        }
        if (vehicleType) {
            where.vehicleType = vehicleType;
        }
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
                { licenseNumber: { contains: search, mode: 'insensitive' } },
                { vehiclePlate: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [applications, total] = await Promise.all([
            prisma.riderApplication.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phoneNumber: true,
                        },
                    },
                    documents: {
                        select: {
                            id: true,
                            documentType: true,
                            fileName: true,
                            fileUrl: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit),
            }),
            prisma.riderApplication.count({ where }),
        ]);
        res.json({
            applications,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Error fetching rider applications:', error);
        res.status(500).json({ error: 'Failed to fetch rider applications' });
    }
});
router.get('/:id', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDER_APPLICATIONS', 'VIEW'), async (req, res) => {
    try {
        const { id } = req.params;
        const application = await prisma.riderApplication.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                        createdAt: true,
                    },
                },
                documents: {
                    select: {
                        id: true,
                        documentType: true,
                        fileName: true,
                        fileUrl: true,
                        fileSize: true,
                        mimeType: true,
                        uploadedAt: true,
                    },
                },
            },
        });
        if (!application) {
            return res.status(404).json({ error: 'Rider application not found' });
        }
        res.json(application);
    }
    catch (error) {
        console.error('Error fetching rider application:', error);
        res.status(500).json({ error: 'Failed to fetch rider application' });
    }
});
router.put('/:id/approve', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDER_APPLICATIONS', 'EDIT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        const application = await prisma.riderApplication.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!application) {
            return res.status(404).json({ error: 'Rider application not found' });
        }
        if (application.status !== 'PENDING' && application.status !== 'UNDER_REVIEW' && application.status !== 'SUSPENDED') {
            return res.status(400).json({ error: 'Application cannot be approved in current status' });
        }
        const updatedApplication = await prisma.riderApplication.update({
            where: { id },
            data: {
                status: 'APPROVED',
                reviewedBy: req.user?.username,
                reviewedAt: new Date(),
                approvedAt: new Date(),
                rejectionReason: null,
            },
        });
        const existingDriver = await prisma.driver.findUnique({
            where: { userId: application.userId },
        });
        if (updatedApplication.status === 'APPROVED') {
            if (!existingDriver) {
                const driverId = `DRV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                await prisma.driver.create({
                    data: {
                        userId: application.userId,
                        riderApplicationId: application.id,
                        driverId,
                        isOnline: false,
                        status: 'OFFLINE',
                        totalRides: 0,
                        totalEarnings: 0,
                        isVerified: true,
                        isActive: true,
                    },
                });
            }
            else {
                await prisma.driver.update({
                    where: { userId: application.userId },
                    data: {
                        status: 'OFFLINE',
                        isOnline: false,
                        isActive: true,
                    },
                });
            }
        }
        res.json(updatedApplication);
    }
    catch (error) {
        console.error('Error approving rider application:', error);
        res.status(500).json({ error: 'Failed to approve rider application' });
    }
});
router.put('/:id/reject', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDER_APPLICATIONS', 'EDIT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        if (!rejectionReason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }
        const application = await prisma.riderApplication.findUnique({
            where: { id },
        });
        if (!application) {
            return res.status(404).json({ error: 'Rider application not found' });
        }
        if (application.status !== 'PENDING' && application.status !== 'UNDER_REVIEW') {
            return res.status(400).json({ error: 'Application cannot be rejected in current status' });
        }
        const updatedApplication = await prisma.riderApplication.update({
            where: { id },
            data: {
                status: 'REJECTED',
                reviewedBy: req.user?.username,
                reviewedAt: new Date(),
                rejectionReason,
            },
        });
        res.json(updatedApplication);
    }
    catch (error) {
        console.error('Error rejecting rider application:', error);
        res.status(500).json({ error: 'Failed to reject rider application' });
    }
});
router.put('/:id/suspend', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDER_APPLICATIONS', 'EDIT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        const application = await prisma.riderApplication.findUnique({
            where: { id },
        });
        if (!application) {
            return res.status(404).json({ error: 'Rider application not found' });
        }
        if (application.status !== 'APPROVED') {
            return res.status(400).json({ error: 'Only approved applications can be suspended' });
        }
        const updatedApplication = await prisma.riderApplication.update({
            where: { id },
            data: {
                status: 'SUSPENDED',
                reviewedBy: req.user?.username,
                reviewedAt: new Date(),
                rejectionReason,
            },
        });
        await prisma.driver.updateMany({
            where: { riderApplicationId: id },
            data: { isActive: false, status: 'SUSPENDED' },
        });
        res.json(updatedApplication);
    }
    catch (error) {
        console.error('Error suspending rider application:', error);
        res.status(500).json({ error: 'Failed to suspend rider application' });
    }
});
router.get('/stats/overview', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDER_APPLICATIONS', 'VIEW'), async (req, res) => {
    try {
        const [totalApplications, pendingApplications, approvedApplications, rejectedApplications, suspendedApplications, todayApplications, thisWeekApplications, thisMonthApplications,] = await Promise.all([
            prisma.riderApplication.count(),
            prisma.riderApplication.count({ where: { status: 'PENDING' } }),
            prisma.riderApplication.count({ where: { status: 'APPROVED' } }),
            prisma.riderApplication.count({ where: { status: 'REJECTED' } }),
            prisma.riderApplication.count({ where: { status: 'SUSPENDED' } }),
            prisma.riderApplication.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
            prisma.riderApplication.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setDate(new Date().getDate() - 7)),
                    },
                },
            }),
            prisma.riderApplication.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
        ]);
        res.json({
            totalApplications,
            pendingApplications,
            approvedApplications,
            rejectedApplications,
            suspendedApplications,
            todayApplications,
            thisWeekApplications,
            thisMonthApplications,
        });
    }
    catch (error) {
        console.error('Error fetching application statistics:', error);
        res.status(500).json({ error: 'Failed to fetch application statistics' });
    }
});
router.get('/stats/by-status', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDER_APPLICATIONS', 'VIEW'), async (req, res) => {
    try {
        const statusCounts = await prisma.riderApplication.groupBy({
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
router.get('/stats/by-vehicle-type', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDER_APPLICATIONS', 'VIEW'), async (req, res) => {
    try {
        const vehicleTypeCounts = await prisma.riderApplication.groupBy({
            by: ['vehicleType'],
            _count: {
                vehicleType: true,
            },
        });
        const vehicleTypeData = vehicleTypeCounts.map(item => ({
            vehicleType: item.vehicleType,
            count: item._count.vehicleType,
        }));
        res.json(vehicleTypeData);
    }
    catch (error) {
        console.error('Error fetching vehicle type statistics:', error);
        res.status(500).json({ error: 'Failed to fetch vehicle type statistics' });
    }
});
exports.default = router;
//# sourceMappingURL=rider-applications.js.map