"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const permissions_1 = require("../middleware/permissions");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_PRINCIPAL_BUSINESS', 'VIEW'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const parsedStart = startDate && startDate !== 'undefined' ? new Date(startDate) : undefined;
        const parsedEnd = endDate && endDate !== 'undefined' ? new Date(endDate) : undefined;
        const hasValidRange = parsedStart instanceof Date && !isNaN(parsedStart.getTime()) && parsedEnd instanceof Date && !isNaN(parsedEnd.getTime());
        const dateRange = hasValidRange ? { gte: parsedStart, lte: parsedEnd } : undefined;
        const grouped = await prisma.salesRep.groupBy({
            by: ['parentSellerId'],
            _count: { parentSellerId: true },
            orderBy: { parentSellerId: 'asc' }
        });
        const parentIds = grouped.map((g) => g.parentSellerId).filter(Boolean);
        const principals = await prisma.user.findMany({
            where: { id: { in: parentIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                createdAt: true,
            },
        });
        const results = await Promise.all(principals.map(async (principal) => {
            const children = await prisma.salesRep.findMany({
                where: { parentSellerId: principal.id },
                select: { userId: true }
            });
            const childUserIds = children.map(c => c.userId);
            const [ordersCountAll, salesByCurrency, productsCount] = await Promise.all([
                prisma.orders.count({
                    where: {
                        sellerId: { in: childUserIds },
                        ...(dateRange && { createdAt: dateRange })
                    }
                }),
                prisma.orders.groupBy({
                    by: ['currencyCode'],
                    where: {
                        sellerId: { in: childUserIds },
                        paymentStatus: 'PAID',
                        ...(dateRange && { createdAt: dateRange })
                    },
                    _sum: { totalAmount: true }
                }),
                prisma.product.count({
                    where: {
                        sellerId: { in: childUserIds },
                        ...(dateRange && { createdAt: dateRange })
                    }
                })
            ]);
            return {
                principal: {
                    id: principal.id,
                    name: `${principal.firstName || ''} ${principal.lastName || ''}`.trim(),
                    phoneNumber: principal.phoneNumber,
                    createdAt: principal.createdAt,
                },
                repsCount: grouped.find((g) => g.parentSellerId === principal.id)?._count?.parentSellerId || 0,
                commerce: {
                    ordersCount: ordersCountAll || 0,
                    salesByCurrency: (salesByCurrency || []).map((r) => ({
                        currencyCode: r.currencyCode,
                        totalSales: r._sum?.totalAmount || 0
                    })),
                    productsCount,
                }
            };
        }));
        res.json({ success: true, data: results });
    }
    catch (error) {
        console.error('Error fetching principal businesses:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch principal businesses' });
    }
});
router.get('/:userId/children', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_PRINCIPAL_BUSINESS', 'VIEW'), async (req, res) => {
    try {
        const { userId } = req.params;
        const reps = await prisma.salesRep.findMany({
            where: { parentSellerId: userId },
            select: { userId: true },
        });
        const childIds = reps.map(r => r.userId);
        const users = await prisma.user.findMany({
            where: { id: { in: childIds } },
            select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        });
        const userMap = new Map(users.map(u => [u.id, u]));
        const results = await Promise.all(reps.map(async (rep) => {
            const [ordersCount, productsCount] = await Promise.all([
                prisma.orders.count({ where: { sellerId: rep.userId } }),
                prisma.product.count({ where: { sellerId: rep.userId } })
            ]);
            const u = userMap.get(rep.userId);
            return {
                userId: rep.userId,
                name: `${u?.firstName || ''} ${u?.lastName || ''}`.trim(),
                phoneNumber: u?.phoneNumber,
                hasActivity: (ordersCount + productsCount) > 0,
                ordersCount,
                productsCount,
            };
        }));
        const filtered = results.filter(r => r.hasActivity);
        res.json({ success: true, data: filtered });
    }
    catch (error) {
        console.error('Error fetching principal children with activity:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch children' });
    }
});
router.get('/:userId/analytics', auth_1.authenticate, (0, permissions_1.requirePermission)('ECOMMERCE_PRINCIPAL_BUSINESS', 'VIEW'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;
        const parsedStart = startDate && startDate !== 'undefined' ? new Date(startDate) : undefined;
        const parsedEnd = endDate && endDate !== 'undefined' ? new Date(endDate) : undefined;
        const hasValidRange = parsedStart instanceof Date && !isNaN(parsedStart.getTime()) && parsedEnd instanceof Date && !isNaN(parsedEnd.getTime());
        const dateRange = hasValidRange ? { gte: parsedStart, lte: parsedEnd } : undefined;
        const [ordersCountAll, ordersByStatus, productsCount, salesByCurrency] = await Promise.all([
            prisma.orders.count({
                where: {
                    sellerId: userId,
                    ...(dateRange && { createdAt: dateRange })
                }
            }),
            prisma.orders.groupBy({
                by: ['status'],
                where: {
                    sellerId: userId,
                    ...(dateRange && { createdAt: dateRange })
                },
                _count: { _all: true }
            }),
            prisma.product.count({
                where: {
                    sellerId: userId,
                    ...(dateRange && { createdAt: dateRange })
                }
            }),
            prisma.orders.groupBy({
                by: ['currencyCode'],
                where: {
                    sellerId: userId,
                    paymentStatus: 'PAID',
                    ...(dateRange && { createdAt: dateRange })
                },
                _sum: { totalAmount: true }
            })
        ]);
        res.json({
            success: true,
            data: {
                orders: {
                    count: ordersCountAll || 0,
                    salesByCurrency: (salesByCurrency || []).map((r) => ({
                        currencyCode: r.currencyCode,
                        totalSales: r._sum?.totalAmount || 0
                    })),
                    byStatus: ordersByStatus?.map((r) => ({ status: r.status, count: r._count?._all || 0 })) || [],
                },
                products: {
                    count: productsCount,
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching principal analytics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
});
exports.default = router;
//# sourceMappingURL=principal-business.js.map