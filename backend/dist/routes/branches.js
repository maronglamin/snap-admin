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
        const branches = await prisma.branch.findMany({
            include: {
                parentSeller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                salesReps: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        salesReps: true,
                        products: true,
                        orders: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(branches);
    }
    catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
});
router.get('/:id', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_BRANCH_DETAILS', 'VIEW'), async (req, res) => {
    try {
        const { id } = req.params;
        const branch = await prisma.branch.findUnique({
            where: { id },
            include: {
                parentSeller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                salesReps: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                phoneNumber: true,
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
                },
                _count: {
                    select: {
                        salesReps: true,
                        products: true,
                        orders: true,
                    },
                },
            },
        });
        if (!branch) {
            return res.status(404).json({ error: 'Branch not found' });
        }
        res.json(branch);
    }
    catch (error) {
        console.error('Error fetching branch details:', error);
        res.status(500).json({ error: 'Failed to fetch branch details' });
    }
});
router.post('/', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_SALES_OUTLETS', 'ADD'), async (req, res) => {
    try {
        const { parentSellerId, name, address, city, state, country, postalCode, phoneNumber, email, } = req.body;
        if (!parentSellerId || !name) {
            return res.status(400).json({ error: 'Parent seller ID and name are required' });
        }
        const parentSeller = await prisma.user.findUnique({
            where: { id: parentSellerId },
        });
        if (!parentSeller) {
            return res.status(400).json({ error: 'Parent seller not found' });
        }
        const branch = await prisma.branch.create({
            data: {
                parentSellerId,
                name,
                address,
                city,
                state,
                country,
                postalCode,
                phoneNumber,
                email,
            },
            include: {
                parentSeller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                _count: {
                    select: {
                        salesReps: true,
                        products: true,
                        orders: true,
                    },
                },
            },
        });
        res.status(201).json(branch);
    }
    catch (error) {
        console.error('Error creating branch:', error);
        res.status(500).json({ error: 'Failed to create branch' });
    }
});
router.put('/:id', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_SALES_OUTLETS', 'EDIT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, city, state, country, postalCode, phoneNumber, email, isActive, } = req.body;
        const branch = await prisma.branch.update({
            where: { id },
            data: {
                name,
                address,
                city,
                state,
                country,
                postalCode,
                phoneNumber,
                email,
                isActive,
            },
            include: {
                parentSeller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    },
                },
                _count: {
                    select: {
                        salesReps: true,
                        products: true,
                        orders: true,
                    },
                },
            },
        });
        res.json(branch);
    }
    catch (error) {
        console.error('Error updating branch:', error);
        res.status(500).json({ error: 'Failed to update branch' });
    }
});
router.delete('/:id', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_SALES_OUTLETS', 'DELETE'), async (req, res) => {
    try {
        const { id } = req.params;
        const salesRepsCount = await prisma.salesRep.count({
            where: { branchId: id },
        });
        if (salesRepsCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete branch with existing sales representatives'
            });
        }
        await prisma.branch.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting branch:', error);
        res.status(500).json({ error: 'Failed to delete branch' });
    }
});
router.get('/:id/sales-reps', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_BRANCH_DETAILS', 'VIEW'), async (req, res) => {
    try {
        const { id } = req.params;
        const salesReps = await prisma.salesRep.findMany({
            where: { branchId: id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
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
exports.default = router;
//# sourceMappingURL=branches.js.map