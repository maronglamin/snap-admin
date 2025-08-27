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
router.get('/', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RENTAL', 'VIEW'), async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search, startDate, endDate } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (status && status !== 'all') {
            where.status = status;
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
                { requestId: { contains: search, mode: 'insensitive' } },
                { pickupAddress: { contains: search, mode: 'insensitive' } },
                { customer: { firstName: { contains: search, mode: 'insensitive' } } },
                { customer: { lastName: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [rentalRequests, total] = await Promise.all([
            prisma.rentalRequest.findMany({
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
                    rideService: {
                        select: {
                            id: true,
                            name: true,
                            vehicleType: true,
                            currency: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit),
            }),
            prisma.rentalRequest.count({ where }),
        ]);
        res.json({
            rentalRequests,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Error fetching rental requests:', error);
        res.status(500).json({ error: 'Failed to fetch rental requests' });
    }
});
router.get('/:id', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RENTAL', 'VIEW'), async (req, res) => {
    try {
        const { id } = req.params;
        const rentalRequest = await prisma.rentalRequest.findUnique({
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
                rideService: {
                    select: {
                        id: true,
                        name: true,
                        vehicleType: true,
                        currency: true,
                    },
                },
                messages: {
                    select: {
                        id: true,
                        content: true,
                        senderType: true,
                        createdAt: true,
                        sender: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phoneNumber: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!rentalRequest) {
            return res.status(404).json({ error: 'Rental request not found' });
        }
        const externalTransactions = await prisma.externalTransaction.findMany({
            where: {
                rentalRequestId: id,
            },
            orderBy: { createdAt: 'desc' },
        });
        const paymentInfo = {
            original: externalTransactions.find(t => t.transactionType === 'ORIGINAL'),
            fee: externalTransactions.find(t => t.transactionType === 'FEE'),
            serviceFee: externalTransactions.find(t => t.transactionType === 'SERVICE_FEE'),
            allTransactions: externalTransactions,
        };
        res.json({
            success: true,
            rentalRequest: {
                ...rentalRequest,
                paymentInfo
            }
        });
    }
    catch (error) {
        console.error('Error fetching rental request:', error);
        res.status(500).json({ error: 'Failed to fetch rental request' });
    }
});
router.patch('/:id/status', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RENTAL', 'EDIT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const rentalRequest = await prisma.rentalRequest.update({
            where: { id },
            data: {
                status: status,
                notes: notes ? `${new Date().toISOString()}: ${notes}` : undefined,
            },
        });
        res.json({ rentalRequest });
    }
    catch (error) {
        console.error('Error updating rental request status:', error);
        res.status(500).json({ error: 'Failed to update rental request status' });
    }
});
router.get('/export/csv', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RENTAL', 'EXPORT'), async (req, res) => {
    try {
        const { status, search, startDate, endDate } = req.query;
        const where = {};
        if (status && status !== 'all') {
            where.status = status;
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
                { requestId: { contains: search, mode: 'insensitive' } },
                { pickupAddress: { contains: search, mode: 'insensitive' } },
                { customer: { firstName: { contains: search, mode: 'insensitive' } } },
                { customer: { lastName: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const rentalRequests = await prisma.rentalRequest.findMany({
            where,
            include: {
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                driver: {
                    select: {
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
                rideService: {
                    select: {
                        name: true,
                        vehicleType: true,
                        currency: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const csvData = rentalRequests.map((request) => ({
            requestId: request.requestId,
            customerName: `${request.customer.firstName} ${request.customer.lastName}`,
            customerPhone: request.customer.phoneNumber,
            driverName: request.driver ? `${request.driver.user.firstName} ${request.driver.user.lastName}` : 'N/A',
            driverPhone: request.driver ? request.driver.user.phoneNumber : 'N/A',
            rideService: request.rideService.name,
            vehicleType: request.rideService.vehicleType,
            status: request.status,
            pickupAddress: request.pickupAddress,
            startDate: request.startDate,
            endDate: request.endDate,
            days: request.days,
            proposedPrice: request.proposedPrice,
            agreedPrice: request.agreedPrice,
            currency: request.currency,
            createdAt: request.createdAt,
        }));
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=rental-requests-export.csv');
        const csvHeaders = [
            'Request ID',
            'Customer Name',
            'Customer Phone',
            'Driver Name',
            'Driver Phone',
            'Ride Service',
            'Vehicle Type',
            'Status',
            'Pickup Address',
            'Start Date',
            'End Date',
            'Days',
            'Proposed Price',
            'Agreed Price',
            'Currency',
            'Created At',
        ];
        const csvContent = [
            csvHeaders.join(','),
            ...csvData.map(row => [
                row.requestId,
                `"${row.customerName}"`,
                row.customerPhone,
                `"${row.driverName}"`,
                row.driverPhone,
                `"${row.rideService}"`,
                row.vehicleType,
                row.status,
                `"${row.pickupAddress}"`,
                row.startDate,
                row.endDate,
                row.days,
                row.proposedPrice,
                row.agreedPrice,
                row.currency,
                row.createdAt,
            ].join(','))
        ].join('\n');
        res.send(csvContent);
    }
    catch (error) {
        console.error('Error exporting rental requests:', error);
        res.status(500).json({ error: 'Failed to export rental requests' });
    }
});
exports.default = router;
//# sourceMappingURL=rental-requests.js.map