"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/stripe-payments', auth_1.authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = 'all', dateFrom = '', dateTo = '', transactionType = 'all' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {
            gatewayProvider: 'stripe'
        };
        if (transactionType && transactionType !== 'all') {
            where.transactionType = transactionType;
        }
        else {
            where.transactionType = {
                in: ['ORIGINAL', 'FEE']
            };
        }
        if (search) {
            where.OR = [
                { appTransactionId: { contains: search, mode: 'insensitive' } },
                { orderId: { contains: search, mode: 'insensitive' } },
                { rideRequestId: { contains: search, mode: 'insensitive' } },
                { amount: { equals: parseFloat(search) || undefined } },
                { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
                { rideRequest: { requestId: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                const startDate = new Date(dateFrom);
                where.createdAt.gte = startDate;
            }
            if (dateTo) {
                const endDate = new Date(dateTo);
                where.createdAt.lte = endDate;
            }
        }
        const total = await prisma.externalTransaction.count({ where });
        const totalPages = Math.ceil(total / limitNum);
        const transactions = await prisma.externalTransaction.findMany({
            where,
            include: {
                rideRequest: true,
                order: true,
                customer: true,
                seller: true,
                paymentMethod: true
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        });
        res.json({
            success: true,
            data: transactions,
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
        console.error('Get Stripe payments error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/stripe-payments/export', auth_1.authenticate, async (req, res) => {
    try {
        const { search = '', status = 'all', dateFrom = '', dateTo = '', transactionType = 'all' } = req.query;
        const where = {
            gatewayProvider: 'stripe'
        };
        if (transactionType && transactionType !== 'all') {
            where.transactionType = transactionType;
        }
        else {
            where.transactionType = {
                in: ['ORIGINAL', 'FEE']
            };
        }
        if (search) {
            where.OR = [
                { appTransactionId: { contains: search, mode: 'insensitive' } },
                { orderId: { contains: search, mode: 'insensitive' } },
                { rideRequestId: { contains: search, mode: 'insensitive' } },
                { amount: { equals: parseFloat(search) || undefined } },
                { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
                { rideRequest: { requestId: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                const startDate = new Date(dateFrom);
                where.createdAt.gte = startDate;
            }
            if (dateTo) {
                const endDate = new Date(dateTo);
                where.createdAt.lte = endDate;
            }
        }
        const transactions = await prisma.externalTransaction.findMany({
            where,
            include: {
                rideRequest: true,
                order: true,
                customer: true,
                seller: true,
                paymentMethod: true
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({
            success: true,
            data: transactions,
            total: transactions.length,
        });
    }
    catch (error) {
        console.error('Export Stripe payments error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/stripe-payments/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await prisma.externalTransaction.findUnique({
            where: { id },
            include: {
                rideRequest: true,
                order: true,
                customer: true,
                seller: true,
                paymentMethod: true
            },
        });
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found',
            });
        }
        res.json({
            success: true,
            data: transaction,
        });
    }
    catch (error) {
        console.error('Get Stripe payment by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/snap-fees', auth_1.authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = 'all', dateFrom = '', dateTo = '', transactionType = 'all' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {
            transactionType: 'SERVICE_FEE'
        };
        if (search) {
            where.OR = [
                { appTransactionId: { contains: search, mode: 'insensitive' } },
                { orderId: { contains: search, mode: 'insensitive' } },
                { rideRequestId: { contains: search, mode: 'insensitive' } },
                { amount: { equals: parseFloat(search) || undefined } },
                { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
                { rideRequest: { requestId: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                const startDate = new Date(dateFrom);
                where.createdAt.gte = startDate;
            }
            if (dateTo) {
                const endDate = new Date(dateTo);
                where.createdAt.lte = endDate;
            }
        }
        const total = await prisma.externalTransaction.count({ where });
        const totalPages = Math.ceil(total / limitNum);
        const transactions = await prisma.externalTransaction.findMany({
            where,
            include: {
                rideRequest: true,
                order: true,
                customer: true,
                seller: true,
                paymentMethod: true
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        });
        res.json({
            success: true,
            data: transactions,
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
        console.error('Get Snap fees error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/snap-fees/export', auth_1.authenticate, async (req, res) => {
    try {
        const { search = '', status = 'all', dateFrom = '', dateTo = '', transactionType = 'all' } = req.query;
        const where = {
            transactionType: 'SERVICE_FEE'
        };
        if (search) {
            where.OR = [
                { appTransactionId: { contains: search, mode: 'insensitive' } },
                { orderId: { contains: search, mode: 'insensitive' } },
                { rideRequestId: { contains: search, mode: 'insensitive' } },
                { amount: { equals: parseFloat(search) || undefined } },
                { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
                { rideRequest: { requestId: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                const startDate = new Date(dateFrom);
                where.createdAt.gte = startDate;
            }
            if (dateTo) {
                const endDate = new Date(dateTo);
                where.createdAt.lte = endDate;
            }
        }
        const transactions = await prisma.externalTransaction.findMany({
            where,
            include: {
                rideRequest: true,
                order: true,
                customer: true,
                seller: true,
                paymentMethod: true
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({
            success: true,
            data: transactions,
            total: transactions.length,
        });
    }
    catch (error) {
        console.error('Export Snap fees error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/snap-fees/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await prisma.externalTransaction.findUnique({
            where: { id },
            include: {
                rideRequest: true,
                order: true,
                customer: true,
                seller: true,
                paymentMethod: true
            },
        });
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found',
            });
        }
        if (transaction.transactionType !== 'SERVICE_FEE') {
            return res.status(400).json({
                success: false,
                error: 'Transaction is not a Snap fee transaction',
            });
        }
        res.json({
            success: true,
            data: transaction,
        });
    }
    catch (error) {
        console.error('Get Snap fee by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/audit', auth_1.authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = 'all', dateFrom = '', dateTo = '', transactionType = 'all' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {
            transactionType: {
                in: ['ORIGINAL', 'FEE', 'SERVICE_FEE']
            }
        };
        if (transactionType && transactionType !== 'all') {
            where.transactionType = transactionType;
        }
        if (search) {
            where.OR = [
                { appTransactionId: { contains: search, mode: 'insensitive' } },
                { orderId: { contains: search, mode: 'insensitive' } },
                { rideRequestId: { contains: search, mode: 'insensitive' } },
                { amount: { equals: parseFloat(search) || undefined } },
                { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
                { rideRequest: { requestId: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                const startDate = new Date(dateFrom);
                where.createdAt.gte = startDate;
            }
            if (dateTo) {
                const endDate = new Date(dateTo);
                where.createdAt.lte = endDate;
            }
        }
        const total = await prisma.externalTransaction.count({ where });
        const totalPages = Math.ceil(total / limitNum);
        const transactions = await prisma.externalTransaction.findMany({
            where,
            include: {
                rideRequest: true,
                order: true,
                customer: true,
                seller: true,
                paymentMethod: true
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        });
        res.json({
            success: true,
            data: transactions,
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
        console.error('Get audit transactions error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/audit/export', auth_1.authenticate, async (req, res) => {
    try {
        const { search = '', status = 'all', dateFrom = '', dateTo = '', transactionType = 'all' } = req.query;
        const where = {
            transactionType: {
                in: ['ORIGINAL', 'FEE', 'SERVICE_FEE']
            }
        };
        if (transactionType && transactionType !== 'all') {
            where.transactionType = transactionType;
        }
        if (search) {
            where.OR = [
                { appTransactionId: { contains: search, mode: 'insensitive' } },
                { orderId: { contains: search, mode: 'insensitive' } },
                { rideRequestId: { contains: search, mode: 'insensitive' } },
                { amount: { equals: parseFloat(search) || undefined } },
                { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
                { rideRequest: { requestId: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                const startDate = new Date(dateFrom);
                where.createdAt.gte = startDate;
            }
            if (dateTo) {
                const endDate = new Date(dateTo);
                where.createdAt.lte = endDate;
            }
        }
        const transactions = await prisma.externalTransaction.findMany({
            where,
            include: {
                rideRequest: true,
                order: true,
                customer: true,
                seller: true,
                paymentMethod: true
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({
            success: true,
            data: transactions,
            total: transactions.length,
        });
    }
    catch (error) {
        console.error('Export audit transactions error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/audit/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await prisma.externalTransaction.findUnique({
            where: { id },
            include: {
                rideRequest: true,
                order: true,
                customer: true,
                seller: true,
                paymentMethod: true
            },
        });
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found',
            });
        }
        if (!['ORIGINAL', 'FEE', 'SERVICE_FEE'].includes(transaction.transactionType)) {
            return res.status(400).json({
                success: false,
                error: 'Transaction is not an audit transaction type',
            });
        }
        res.json({
            success: true,
            data: transaction,
        });
    }
    catch (error) {
        console.error('Get audit transaction by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=journals.js.map