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
        const { page = 1, limit = 15, timeFilter = 'all', startDate, endDate } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        let dateFilter = {};
        if (timeFilter !== 'all') {
            const now = new Date();
            let start;
            switch (timeFilter) {
                case 'week':
                    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'quarter':
                    const quarter = Math.floor(now.getMonth() / 3);
                    start = new Date(now.getFullYear(), quarter * 3, 1);
                    break;
                case 'year':
                    start = new Date(now.getFullYear(), 0, 1);
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        start = new Date(startDate);
                        const end = new Date(endDate);
                        dateFilter = {
                            createdAt: {
                                gte: start,
                                lte: end,
                            },
                        };
                    }
                    break;
                default:
                    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            }
            if (timeFilter !== 'custom') {
                dateFilter = {
                    createdAt: {
                        gte: start,
                    },
                };
            }
        }
        const branches = await prisma.branch.findMany({
            where: dateFilter,
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
                        userId: true,
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
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip,
            take: limitNum,
        });
        const totalCount = await prisma.branch.count({
            where: dateFilter,
        });
        const branchesWithCounts = [];
        for (const branch of branches) {
            const salesRepUserIds = branch.salesReps.map(rep => rep.userId);
            const productsCount = salesRepUserIds.length > 0
                ? await prisma.product.count({
                    where: {
                        sellerId: {
                            in: salesRepUserIds,
                        },
                    },
                })
                : 0;
            const ordersCount = salesRepUserIds.length > 0
                ? await prisma.orders.count({
                    where: {
                        sellerId: {
                            in: salesRepUserIds,
                        },
                    },
                })
                : 0;
            branchesWithCounts.push({
                ...branch,
                _count: {
                    ...branch._count,
                    products: productsCount,
                    orders: ordersCount,
                },
            });
        }
        res.json({
            success: true,
            data: branchesWithCounts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitNum),
                hasNext: pageNum < Math.ceil(totalCount / limitNum),
                hasPrev: pageNum > 1,
            },
        });
    }
    catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch branches'
        });
    }
});
router.get('/parent-sellers', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_SALES_OUTLETS', 'VIEW'), async (req, res) => {
    try {
        const { page = 1, limit = 15, timeFilter = 'all', startDate, endDate } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        let dateFilter = {};
        if (timeFilter === 'custom' && startDate && endDate) {
            dateFilter = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }
        else if (timeFilter !== 'all') {
            const now = new Date();
            switch (timeFilter) {
                case 'week':
                    dateFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
                    break;
                case 'month':
                    dateFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
                    break;
                case 'quarter':
                    dateFilter = { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
                    break;
                case 'year':
                    dateFilter = { gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
                    break;
            }
        }
        const parentSellers = await prisma.user.findMany({
            where: {
                branches: {
                    some: {}
                },
                ...(Object.keys(dateFilter).length > 0 && {
                    createdAt: dateFilter
                })
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                createdAt: true,
                branches: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        city: true,
                        state: true,
                        country: true,
                        phoneNumber: true,
                        email: true,
                        isActive: true,
                        createdAt: true,
                        salesReps: {
                            select: {
                                id: true,
                                userId: true,
                                user: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        phoneNumber: true,
                                    }
                                }
                            }
                        },
                        _count: {
                            select: {
                                salesReps: true,
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        });
        const parentSellersWithCounts = await Promise.all(parentSellers.map(async (parentSeller) => {
            const allSalesRepUserIds = parentSeller.branches.flatMap(branch => branch.salesReps.map(rep => rep.userId));
            const totalProducts = allSalesRepUserIds.length > 0
                ? await prisma.product.count({
                    where: {
                        sellerId: {
                            in: allSalesRepUserIds,
                        },
                    },
                })
                : 0;
            const totalOrders = allSalesRepUserIds.length > 0
                ? await prisma.orders.count({
                    where: {
                        sellerId: {
                            in: allSalesRepUserIds,
                        },
                    },
                })
                : 0;
            const branchesWithCounts = await Promise.all(parentSeller.branches.map(async (branch) => {
                const branchSalesRepUserIds = branch.salesReps.map(rep => rep.userId);
                const branchProducts = branchSalesRepUserIds.length > 0
                    ? await prisma.product.count({
                        where: {
                            sellerId: {
                                in: branchSalesRepUserIds,
                            },
                        },
                    })
                    : 0;
                const branchOrders = branchSalesRepUserIds.length > 0
                    ? await prisma.orders.count({
                        where: {
                            sellerId: {
                                in: branchSalesRepUserIds,
                            },
                        },
                    })
                    : 0;
                return {
                    ...branch,
                    _count: {
                        ...branch._count,
                        products: branchProducts,
                        orders: branchOrders,
                    }
                };
            }));
            return {
                ...parentSeller,
                branches: branchesWithCounts,
                _count: {
                    branches: parentSeller.branches.length,
                    salesReps: allSalesRepUserIds.length,
                    products: totalProducts,
                    orders: totalOrders,
                }
            };
        }));
        const total = await prisma.user.count({
            where: {
                branches: {
                    some: {}
                },
                ...(Object.keys(dateFilter).length > 0 && {
                    createdAt: dateFilter
                })
            }
        });
        const totalPages = Math.ceil(total / limitNum);
        res.json({
            success: true,
            data: parentSellersWithCounts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1,
            },
        });
    }
    catch (error) {
        console.error('Error fetching parent sellers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch parent sellers',
        });
    }
});
router.get('/parent-sellers/:id', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_SALES_OUTLETS', 'VIEW'), async (req, res) => {
    try {
        const { id } = req.params;
        const parentSeller = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                createdAt: true,
                branches: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        city: true,
                        state: true,
                        country: true,
                        phoneNumber: true,
                        email: true,
                        isActive: true,
                        createdAt: true,
                        salesReps: {
                            select: {
                                id: true,
                                userId: true,
                                user: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        phoneNumber: true,
                                    }
                                }
                            }
                        },
                        _count: {
                            select: {
                                salesReps: true,
                            }
                        }
                    }
                }
            }
        });
        if (!parentSeller) {
            return res.status(404).json({
                success: false,
                error: 'Parent seller not found',
            });
        }
        const allSalesRepUserIds = parentSeller.branches.flatMap(branch => branch.salesReps.map(rep => rep.userId));
        const totalProducts = allSalesRepUserIds.length > 0
            ? await prisma.product.count({
                where: {
                    sellerId: {
                        in: allSalesRepUserIds,
                    },
                },
            })
            : 0;
        const totalOrders = allSalesRepUserIds.length > 0
            ? await prisma.orders.count({
                where: {
                    sellerId: {
                        in: allSalesRepUserIds,
                    },
                },
            })
            : 0;
        const branchesWithCounts = await Promise.all(parentSeller.branches.map(async (branch) => {
            const branchSalesRepUserIds = branch.salesReps.map(rep => rep.userId);
            const branchProducts = branchSalesRepUserIds.length > 0
                ? await prisma.product.count({
                    where: {
                        sellerId: {
                            in: branchSalesRepUserIds,
                        },
                    },
                })
                : 0;
            const branchOrders = branchSalesRepUserIds.length > 0
                ? await prisma.orders.count({
                    where: {
                        sellerId: {
                            in: branchSalesRepUserIds,
                        },
                    },
                })
                : 0;
            return {
                ...branch,
                _count: {
                    ...branch._count,
                    products: branchProducts,
                    orders: branchOrders,
                }
            };
        }));
        const parentSellerWithCounts = {
            ...parentSeller,
            branches: branchesWithCounts,
            _count: {
                branches: parentSeller.branches.length,
                salesReps: allSalesRepUserIds.length,
                products: totalProducts,
                orders: totalOrders,
            }
        };
        res.json({
            success: true,
            data: parentSellerWithCounts,
        });
    }
    catch (error) {
        console.error('Error fetching parent seller:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch parent seller',
        });
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
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
                _count: {
                    select: {
                        salesReps: true,
                    },
                },
            },
        });
        if (!branch) {
            return res.status(404).json({
                success: false,
                error: 'Branch not found'
            });
        }
        const salesRepUserIds = branch.salesReps.map(rep => rep.userId);
        const productsCount = salesRepUserIds.length > 0
            ? await prisma.product.count({
                where: {
                    sellerId: {
                        in: salesRepUserIds,
                    },
                },
            })
            : 0;
        const ordersCount = salesRepUserIds.length > 0
            ? await prisma.orders.count({
                where: {
                    sellerId: {
                        in: salesRepUserIds,
                    },
                },
            })
            : 0;
        const salesRepsWithCounts = await Promise.all(branch.salesReps.map(async (salesRep) => {
            const repProductsCount = await prisma.product.count({
                where: {
                    sellerId: salesRep.userId,
                },
            });
            const repOrdersCount = await prisma.orders.count({
                where: {
                    sellerId: salesRep.userId,
                },
            });
            return {
                ...salesRep,
                _count: {
                    products: repProductsCount,
                    orders: repOrdersCount,
                },
            };
        }));
        const branchWithCounts = {
            ...branch,
            salesReps: salesRepsWithCounts,
            _count: {
                ...branch._count,
                products: productsCount,
                orders: ordersCount,
            },
        };
        res.json({
            success: true,
            data: branchWithCounts,
        });
    }
    catch (error) {
        console.error('Error fetching branch details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch branch details'
        });
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
        res.status(201).json({
            success: true,
            data: branch,
        });
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