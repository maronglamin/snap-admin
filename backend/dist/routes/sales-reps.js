"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const permissions_1 = require("../middleware/permissions");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_SALES_OUTLETS', 'VIEW'), async (req, res) => {
    try {
        const salesReps = await prisma.salesRep.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                parentSeller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                        state: true,
                    },
                },
                _count: {
                    select: {
                        products: true,
                        orders: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(salesReps);
    }
    catch (error) {
        console.error('Error fetching sales reps:', error);
        res.status(500).json({ error: 'Failed to fetch sales reps' });
    }
});
router.get('/:id', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_BRANCH_DETAILS', 'VIEW'), async (req, res) => {
    try {
        const { id } = req.params;
        const salesRep = await prisma.salesRep.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                parentSeller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        city: true,
                        state: true,
                        country: true,
                    },
                },
                _count: {
                    select: {
                        products: true,
                        orders: true,
                    },
                },
            },
        });
        if (!salesRep) {
            return res.status(404).json({ error: 'Sales rep not found' });
        }
        res.json(salesRep);
    }
    catch (error) {
        console.error('Error fetching sales rep details:', error);
        res.status(500).json({ error: 'Failed to fetch sales rep details' });
    }
});
router.post('/', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_SALES_OUTLETS', 'ADD'), async (req, res) => {
    try {
        const { userId, parentSellerId, branchId, } = req.body;
        if (!userId || !parentSellerId || !branchId) {
            return res.status(400).json({
                error: 'User ID, parent seller ID, and branch ID are required'
            });
        }
        const existingSalesRep = await prisma.salesRep.findUnique({
            where: { userId },
        });
        if (existingSalesRep) {
            return res.status(400).json({
                error: 'User is already assigned as a sales representative'
            });
        }
        const branch = await prisma.branch.findUnique({
            where: { id: branchId },
        });
        if (!branch) {
            return res.status(400).json({ error: 'Branch not found' });
        }
        const parentSeller = await prisma.user.findUnique({
            where: { id: parentSellerId },
        });
        if (!parentSeller) {
            return res.status(400).json({ error: 'Parent seller not found' });
        }
        const salesRep = await prisma.salesRep.create({
            data: {
                userId,
                parentSellerId,
                branchId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                parentSeller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                        state: true,
                    },
                },
                _count: {
                    select: {
                        products: true,
                        orders: true,
                    },
                },
            },
        });
        res.status(201).json(salesRep);
    }
    catch (error) {
        console.error('Error creating sales rep:', error);
        res.status(500).json({ error: 'Failed to create sales rep' });
    }
});
router.put('/:id', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_SALES_OUTLETS', 'EDIT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { branchId, status, } = req.body;
        if (branchId) {
            const branch = await prisma.branch.findUnique({
                where: { id: branchId },
            });
            if (!branch) {
                return res.status(400).json({ error: 'Branch not found' });
            }
        }
        const salesRep = await prisma.salesRep.update({
            where: { id },
            data: {
                branchId,
                status,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                parentSeller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                        state: true,
                    },
                },
                _count: {
                    select: {
                        products: true,
                        orders: true,
                    },
                },
            },
        });
        res.json(salesRep);
    }
    catch (error) {
        console.error('Error updating sales rep:', error);
        res.status(500).json({ error: 'Failed to update sales rep' });
    }
});
router.delete('/:id', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_SALES_OUTLETS', 'DELETE'), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.salesRep.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting sales rep:', error);
        res.status(500).json({ error: 'Failed to delete sales rep' });
    }
});
router.get('/:id/performance', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_BRANCH_DETAILS', 'VIEW'), async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;
        const salesRep = await prisma.salesRep.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
                branch: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        if (!salesRep) {
            return res.status(404).json({ error: 'Sales rep not found' });
        }
        const productsCount = await prisma.product.count({
            where: {
                salesRepId: id,
                ...(startDate && endDate && {
                    createdAt: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    },
                }),
            },
        });
        const ordersCount = await prisma.orders.count({
            where: {
                salesRepId: id,
                ...(startDate && endDate && {
                    createdAt: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    },
                }),
            },
        });
        const totalSales = await prisma.orders.aggregate({
            where: {
                salesRepId: id,
                ...(startDate && endDate && {
                    createdAt: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    },
                }),
            },
            _sum: {
                totalAmount: true,
            },
        });
        res.json({
            salesRep: {
                id: salesRep.id,
                name: `${salesRep.user.firstName} ${salesRep.user.lastName}`,
                branch: salesRep.branch.name,
            },
            performance: {
                productsCount,
                ordersCount,
                totalSales: totalSales._sum.totalAmount || 0,
            },
        });
    }
    catch (error) {
        console.error('Error fetching sales rep performance:', error);
        res.status(500).json({ error: 'Failed to fetch sales rep performance' });
    }
});
exports.default = router;
//# sourceMappingURL=sales-reps.js.map