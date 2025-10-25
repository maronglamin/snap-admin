"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/cumulative-entries', auth_1.authenticate, async (req, res) => {
    try {
        const { dateFrom, dateTo, currency, page = 1, limit = 1000 } = req.query;
        const dateFilter = {};
        if (dateFrom) {
            dateFilter.gte = new Date(dateFrom);
        }
        if (dateTo) {
            dateFilter.lte = new Date(dateTo);
        }
        const currencyFilter = currency ? { currencyCode: currency } : {};
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const settlements = await prisma.settlement.findMany({
            where: {
                createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
                currency: currency || undefined,
                status: 'COMPLETED',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    }
                }
            },
            skip,
            take: limitNum,
            orderBy: {
                createdAt: 'desc'
            }
        });
        const orders = await prisma.orders.findMany({
            where: {
                createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
                ...currencyFilter,
            },
            include: {
                User_orders_sellerIdToUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    }
                },
                User_orders_userIdToUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    }
                }
            },
            skip,
            take: limitNum,
            orderBy: {
                createdAt: 'desc'
            }
        });
        const externalTransactions = await prisma.externalTransaction.findMany({
            where: {
                createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
                ...currencyFilter,
                status: 'SUCCESS',
            },
            include: {
                order: {
                    select: {
                        id: true,
                        orderNumber: true,
                    }
                },
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    }
                },
                seller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    }
                }
            },
            skip,
            take: limitNum,
            orderBy: {
                createdAt: 'desc'
            }
        });
        const transactionTypes = externalTransactions.reduce((acc, t) => {
            acc[t.transactionType] = (acc[t.transactionType] || 0) + 1;
            return acc;
        }, {});
        const currencyGroups = {};
        settlements.forEach(settlement => {
            const currency = settlement.currency;
            if (!currencyGroups[currency]) {
                currencyGroups[currency] = {
                    currency,
                    debits: {
                        settlementRequests: 0,
                        original: 0,
                    },
                    credits: {
                        serviceFee: 0,
                        gatewayFee: 0,
                    },
                    details: {
                        settlements: [],
                        orders: [],
                        externalTransactions: [],
                    }
                };
            }
            currencyGroups[currency].debits.settlementRequests += Number(settlement.amount);
            currencyGroups[currency].details.settlements.push(settlement);
        });
        orders.forEach(order => {
            const currency = order.currencyCode;
            if (!currencyGroups[currency]) {
                currencyGroups[currency] = {
                    currency,
                    debits: {
                        settlementRequests: 0,
                        original: 0,
                    },
                    credits: {
                        serviceFee: 0,
                        gatewayFee: 0,
                    },
                    details: {
                        settlements: [],
                        orders: [],
                        externalTransactions: [],
                    }
                };
            }
            currencyGroups[currency].details.orders.push(order);
        });
        externalTransactions.forEach(transaction => {
            const currency = transaction.currencyCode;
            if (!currencyGroups[currency]) {
                currencyGroups[currency] = {
                    currency,
                    debits: {
                        settlementRequests: 0,
                        original: 0,
                    },
                    credits: {
                        serviceFee: 0,
                        gatewayFee: 0,
                    },
                    details: {
                        settlements: [],
                        orders: [],
                        externalTransactions: [],
                    }
                };
            }
            const amount = Number(transaction.amount);
            switch (transaction.transactionType) {
                case 'ORIGINAL':
                    currencyGroups[currency].debits.original += amount;
                    break;
                case 'FEE':
                    currencyGroups[currency].credits.gatewayFee += amount;
                    break;
                case 'SERVICE_FEE':
                    currencyGroups[currency].credits.serviceFee += amount;
                    break;
            }
            currencyGroups[currency].details.externalTransactions.push(transaction);
        });
        Object.keys(currencyGroups).forEach(currency => {
            const group = currencyGroups[currency];
            group.totalDebits = Object.values(group.debits).reduce((sum, value) => sum + value, 0);
            group.totalCredits = Object.values(group.credits).reduce((sum, value) => sum + value, 0);
            group.netPosition = group.totalDebits - group.totalCredits;
        });
        const result = Object.values(currencyGroups).sort((a, b) => a.currency.localeCompare(b.currency));
        const totalSettlements = await prisma.settlement.count({
            where: {
                createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
                currency: currency || undefined,
                status: 'COMPLETED',
            }
        });
        const totalOrders = await prisma.orders.count({
            where: {
                createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
                ...currencyFilter,
            }
        });
        const totalTransactions = await prisma.externalTransaction.count({
            where: {
                createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
                ...currencyFilter,
                status: 'SUCCESS',
            }
        });
        const totalRecords = totalSettlements + totalOrders + totalTransactions;
        const totalPages = Math.ceil(totalRecords / limitNum);
        res.json({
            success: true,
            data: result,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalRecords,
                totalPages,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
                totalSettlements,
                totalOrders,
                totalTransactions
            },
            summary: {
                totalCurrencies: result.length,
                totalDebits: result.find((group) => group.currency === 'GMD')?.totalDebits || 0,
                totalCredits: result.find((group) => group.currency === 'GMD')?.totalCredits || 0,
                netPosition: result.find((group) => group.currency === 'GMD')?.netPosition || 0,
            }
        });
    }
    catch (error) {
        console.error('Error in cumulative-entries:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = 'all', type = 'all', currency = 'all', dateFrom = '', dateTo = '', } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (search) {
            where.OR = [
                { reference: { contains: search, mode: 'insensitive' } },
                { user: {
                        OR: [
                            { firstName: { contains: search, mode: 'insensitive' } },
                            { lastName: { contains: search, mode: 'insensitive' } },
                            { phoneNumber: { contains: search, mode: 'insensitive' } }
                        ]
                    } },
            ];
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        if (type && type !== 'all') {
            where.type = type;
        }
        if (currency && currency !== 'all') {
            where.currency = currency;
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                where.createdAt.gte = new Date(dateFrom);
            }
            if (dateTo) {
                where.createdAt.lte = new Date(dateTo);
            }
        }
        const total = await prisma.settlement.count({ where });
        const totalPages = Math.ceil(total / limitNum);
        const settlements = await prisma.settlement.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    }
                },
                bankAccount: {
                    select: {
                        id: true,
                        accountName: true,
                        bankName: true,
                        accountNumber: true,
                    }
                },
                wallet: {
                    select: {
                        id: true,
                        walletType: true,
                        walletAddress: true,
                        account: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        });
        res.json({
            success: true,
            data: settlements,
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
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const settlement = await prisma.settlement.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                        sellerKyc: {
                            select: {
                                id: true,
                                businessName: true,
                                status: true,
                                verifiedAt: true,
                            }
                        }
                    }
                },
                bankAccount: {
                    select: {
                        id: true,
                        accountName: true,
                        accountNumber: true,
                        bankName: true,
                        bankCode: true,
                        branchCode: true,
                        swiftCode: true,
                        iban: true,
                        currency: true,
                        isDefault: true,
                        status: true,
                    }
                },
                wallet: {
                    select: {
                        id: true,
                        walletType: true,
                        walletAddress: true,
                        account: true,
                        currency: true,
                        isDefault: true,
                        status: true,
                    }
                }
            },
        });
        if (!settlement) {
            return res.status(404).json({
                success: false,
                error: 'Settlement not found',
            });
        }
        res.json({
            success: true,
            data: settlement,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.put('/:id/status', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required',
            });
        }
        const settlement = await prisma.settlement.update({
            where: { id },
            data: {
                status,
                processedAt: status === 'COMPLETED' ? new Date() : null,
                updatedAt: new Date(),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                    }
                }
            },
        });
        res.json({
            success: true,
            data: settlement,
            message: 'Settlement status updated successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.put('/bulk-update-status', auth_1.authenticate, async (req, res) => {
    try {
        const { ids, status } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Settlement IDs array is required',
            });
        }
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required',
            });
        }
        const updatedSettlements = await prisma.$transaction(async (tx) => {
            const updates = await Promise.all(ids.map((id) => tx.settlement.update({
                where: { id },
                data: {
                    status,
                    processedAt: status === 'COMPLETED' ? new Date() : null,
                    updatedAt: new Date(),
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phoneNumber: true,
                        }
                    }
                },
            })));
            return updates;
        });
        res.json({
            success: true,
            data: updatedSettlements,
            message: `Successfully updated ${updatedSettlements.length} settlement(s) to ${status}`,
        });
    }
    catch (error) {
        console.error('Bulk update settlement status error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=settlements.js.map