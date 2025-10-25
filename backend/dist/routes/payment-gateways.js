"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', type = 'all', countryCode = 'all', currencyCode = 'all', status = 'all' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { type: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (type && type !== 'all') {
            where.type = type;
        }
        if (countryCode && countryCode !== 'all') {
            where.countryCode = countryCode;
        }
        if (currencyCode && currencyCode !== 'all') {
            where.currencyCode = currencyCode;
        }
        if (status && status !== 'all') {
            where.isActive = status === 'active';
        }
        const total = await prisma.paymentGatewayServiceProvider.count({ where });
        const paymentGateways = await prisma.paymentGatewayServiceProvider.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { createdAt: 'desc' },
        });
        const totalPages = Math.ceil(total / limitNum);
        res.json({
            success: true,
            data: paymentGateways,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: total,
                itemsPerPage: limitNum,
            },
        });
    }
    catch (error) {
        console.error('Get payment gateways error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { name, type, countryCode, currencyCode, description, logoUrl, metadata, isActive = true, } = req.body;
        if (!name || !type || !countryCode || !currencyCode) {
            return res.status(400).json({
                success: false,
                error: 'Name, type, country code, and currency code are required',
            });
        }
        const existingGateway = await prisma.paymentGatewayServiceProvider.findUnique({
            where: {
                name_countryCode: {
                    name,
                    countryCode,
                },
            },
        });
        if (existingGateway) {
            return res.status(400).json({
                success: false,
                error: 'Payment gateway with this name already exists for this country',
            });
        }
        const paymentGateway = await prisma.paymentGatewayServiceProvider.create({
            data: {
                name,
                type,
                countryCode,
                currencyCode,
                description,
                logoUrl,
                metadata: metadata || {},
                isActive,
                createdBy: req.user.username,
            },
        });
        res.status(201).json({
            success: true,
            data: paymentGateway,
        });
    }
    catch (error) {
        console.error('Create payment gateway error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.put('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, countryCode, currencyCode, description, logoUrl, metadata, isActive, } = req.body;
        const existingGateway = await prisma.paymentGatewayServiceProvider.findUnique({
            where: { id },
        });
        if (!existingGateway) {
            return res.status(404).json({
                success: false,
                error: 'Payment gateway not found',
            });
        }
        if ((name && name !== existingGateway.name) || (countryCode && countryCode !== existingGateway.countryCode)) {
            const duplicateGateway = await prisma.paymentGatewayServiceProvider.findUnique({
                where: {
                    name_countryCode: {
                        name: name || existingGateway.name,
                        countryCode: countryCode || existingGateway.countryCode,
                    },
                },
            });
            if (duplicateGateway && duplicateGateway.id !== id) {
                return res.status(400).json({
                    success: false,
                    error: 'Payment gateway with this name already exists for this country',
                });
            }
        }
        const updatedGateway = await prisma.paymentGatewayServiceProvider.update({
            where: { id },
            data: {
                name,
                type,
                countryCode,
                currencyCode,
                description,
                logoUrl,
                metadata,
                isActive,
            },
        });
        res.json({
            success: true,
            data: updatedGateway,
        });
    }
    catch (error) {
        console.error('Update payment gateway error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const existingGateway = await prisma.paymentGatewayServiceProvider.findUnique({
            where: { id },
        });
        if (!existingGateway) {
            return res.status(404).json({
                success: false,
                error: 'Payment gateway not found',
            });
        }
        await prisma.paymentGatewayServiceProvider.delete({
            where: { id },
        });
        res.json({
            success: true,
            message: 'Payment gateway deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete payment gateway error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/types', auth_1.authenticate, async (req, res) => {
    try {
        const types = await prisma.paymentGatewayServiceProvider.findMany({
            select: { type: true },
            distinct: ['type'],
            orderBy: { type: 'asc' },
        });
        const uniqueTypes = types.map(item => item.type);
        res.json({
            success: true,
            data: uniqueTypes,
        });
    }
    catch (error) {
        console.error('Get payment gateway types error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/countries', auth_1.authenticate, async (req, res) => {
    try {
        const countries = await prisma.paymentGatewayServiceProvider.findMany({
            select: { countryCode: true },
            distinct: ['countryCode'],
            orderBy: { countryCode: 'asc' },
        });
        const uniqueCountries = countries.map(item => item.countryCode);
        res.json({
            success: true,
            data: uniqueCountries,
        });
    }
    catch (error) {
        console.error('Get payment gateway countries error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/currencies', auth_1.authenticate, async (req, res) => {
    try {
        const currencies = await prisma.paymentGatewayServiceProvider.findMany({
            select: { currencyCode: true },
            distinct: ['currencyCode'],
            orderBy: { currencyCode: 'asc' },
        });
        const uniqueCurrencies = currencies.map(item => item.currencyCode);
        res.json({
            success: true,
            data: uniqueCurrencies,
        });
    }
    catch (error) {
        console.error('Get payment gateway currencies error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const paymentGateway = await prisma.paymentGatewayServiceProvider.findUnique({
            where: { id },
        });
        if (!paymentGateway) {
            return res.status(404).json({
                success: false,
                error: 'Payment gateway not found',
            });
        }
        res.json({
            success: true,
            data: paymentGateway,
        });
    }
    catch (error) {
        console.error('Get payment gateway by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=payment-gateways.js.map