"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const config_1 = __importDefault(require("../config"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const transformDocumentUrl = (documentUrl) => {
    if (!documentUrl)
        return null;
    if (documentUrl.startsWith('http://') || documentUrl.startsWith('https://')) {
        return documentUrl;
    }
    return `${config_1.default.imageServer.url}${documentUrl.startsWith('/') ? '' : '/'}${documentUrl}`;
};
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = 'all', type = 'all', kycStatus = 'all', hasKYC = false, startDate, endDate } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        const andConditions = [];
        const orConditions = [];
        if (search) {
            andConditions.push({
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { phoneNumber: { contains: search, mode: 'insensitive' } },
                ]
            });
        }
        if (startDate || endDate) {
            const createdAt = {};
            if (startDate)
                createdAt.gte = new Date(startDate);
            if (endDate)
                createdAt.lte = new Date(endDate);
            andConditions.push({ createdAt });
        }
        if (hasKYC === 'true') {
            andConditions.push({ sellerKyc: { isNot: null } });
        }
        if (type === 'BUYER') {
            andConditions.push({ sellerKyc: { is: null } });
        }
        else if (type === 'SELLER') {
            andConditions.push({ sellerKyc: { isNot: null } });
        }
        if (kycStatus !== 'all' && type !== 'BUYER') {
            andConditions.push({ sellerKyc: { is: { status: kycStatus } } });
        }
        if (status !== 'all') {
            if (status === 'ACTIVE') {
                if (type === 'SELLER') {
                    andConditions.push({ sellerKyc: { is: { status: 'APPROVED' } } });
                }
                else if (type === 'BUYER') {
                    andConditions.push({ sellerKyc: { is: null } });
                }
                else {
                    orConditions.push({ sellerKyc: { is: null } });
                    orConditions.push({ sellerKyc: { is: { status: 'APPROVED' } } });
                }
            }
            else if (status === 'PENDING') {
                andConditions.push({ sellerKyc: { is: { status: 'PENDING' } } });
            }
            else if (status === 'SUSPENDED') {
                andConditions.push({ sellerKyc: { is: { status: { in: ['REJECTED', 'SUSPENDED'] } } } });
            }
        }
        if (andConditions.length > 0) {
            where.AND = [...(where.AND || []), ...andConditions];
        }
        if (orConditions.length > 0) {
            where.AND = [...(where.AND || []), { OR: orConditions }];
        }
        const totalFiltered = await prisma.user.count({ where });
        const allUsers = await prisma.user.findMany({
            where,
            include: {
                sellerKyc: {
                    select: {
                        id: true,
                        status: true,
                        businessName: true,
                        businessType: true,
                        registrationNumber: true,
                        taxId: true,
                        address: true,
                        city: true,
                        state: true,
                        postalCode: true,
                        country: true,
                        documentType: true,
                        documentNumber: true,
                        documentUrl: true,
                        documentExpiryDate: true,
                        rejectionReason: true,
                        verifiedAt: true,
                        createdAt: true,
                        statusChangedBy: true,
                        statusChangedAt: true,
                        bankAccounts: {
                            select: {
                                id: true,
                                accountNumber: true,
                                accountName: true,
                                bankName: true,
                                bankCode: true,
                                currency: true,
                            }
                        },
                        wallets: {
                            select: {
                                id: true,
                                walletType: true,
                                walletAddress: true,
                                account: true,
                                currency: true,
                            }
                        },
                    }
                },
                products: {
                    select: {
                        id: true,
                        status: true,
                    }
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        });
        const allTransformedUsers = allUsers.map(user => {
            const isSeller = !!user.sellerKyc;
            const userType = isSeller ? 'SELLER' : 'BUYER';
            let userStatus = 'ACTIVE';
            if (user.sellerKyc) {
                switch (user.sellerKyc.status) {
                    case 'PENDING':
                        userStatus = 'PENDING';
                        break;
                    case 'REJECTED':
                        userStatus = 'SUSPENDED';
                        break;
                    case 'SUSPENDED':
                        userStatus = 'SUSPENDED';
                        break;
                    case 'APPROVED':
                        userStatus = 'ACTIVE';
                        break;
                }
            }
            return {
                id: user.id,
                type: userType,
                status: userStatus,
                kycStatus: user.sellerKyc?.status || null,
                user,
            };
        });
        const totalPages = Math.ceil(totalFiltered / limitNum);
        const transformedUsers = allTransformedUsers.map(({ user, type: userType, status: userStatus, kycStatus }) => {
            const totalProducts = user.products.filter(p => p.status === 'ACTIVE').length;
            let totalSales = 0;
            let totalSpent = 0;
            let latestCurrency = null;
            let allCurrencies = [];
            let currencyTotals = {};
            if (!latestCurrency) {
                latestCurrency = 'GMD';
                currencyTotals = { GMD: 0 };
            }
            return {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
                email: null,
                type: userType,
                status: userStatus,
                joinDate: user.createdAt,
                lastActive: user.updatedAt,
                totalProducts,
                totalOrders: 0,
                totalSales,
                totalSpent,
                totalSettlements: 0,
                latestCurrency,
                allCurrencies,
                currencyTotals,
                kycStatus: user.sellerKyc?.status || null,
                kycVerifiedAt: user.sellerKyc?.verifiedAt || null,
                businessName: user.sellerKyc?.businessName || null,
                businessType: user.sellerKyc?.businessType || null,
                kycDetails: user.sellerKyc ? {
                    id: user.sellerKyc.id,
                    businessName: user.sellerKyc.businessName,
                    businessType: user.sellerKyc.businessType,
                    registrationNumber: user.sellerKyc.registrationNumber,
                    taxId: user.sellerKyc.taxId,
                    address: user.sellerKyc.address,
                    city: user.sellerKyc.city,
                    state: user.sellerKyc.state,
                    postalCode: user.sellerKyc.postalCode,
                    country: user.sellerKyc.country,
                    documentType: user.sellerKyc.documentType,
                    documentNumber: user.sellerKyc.documentNumber,
                    documentUrl: transformDocumentUrl(user.sellerKyc.documentUrl),
                    documentExpiryDate: user.sellerKyc.documentExpiryDate,
                    status: user.sellerKyc.status,
                    rejectionReason: user.sellerKyc.rejectionReason,
                    verifiedAt: user.sellerKyc.verifiedAt,
                    createdAt: user.sellerKyc.createdAt,
                    statusChangedBy: user.sellerKyc.statusChangedBy,
                    statusChangedAt: user.sellerKyc.statusChangedAt,
                    bankAccounts: user.sellerKyc.bankAccounts,
                    wallets: user.sellerKyc.wallets,
                } : null,
            };
        });
        res.json({
            success: true,
            data: transformedUsers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalFiltered,
                totalPages,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1,
            },
        });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                sellerKyc: {
                    include: {
                        bankAccounts: true,
                        wallets: true,
                    }
                },
                products: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        currencyCode: true,
                        status: true,
                        createdAt: true,
                    }
                },
                orders_orders_userIdToUser: {
                    select: {
                        id: true,
                        orderNumber: true,
                        totalAmount: true,
                        currencyCode: true,
                        status: true,
                        paymentStatus: true,
                        createdAt: true,
                    }
                },
                orders_orders_sellerIdToUser: {
                    select: {
                        id: true,
                        orderNumber: true,
                        totalAmount: true,
                        currencyCode: true,
                        status: true,
                        paymentStatus: true,
                        createdAt: true,
                    }
                },
                settlements: {
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                        createdAt: true,
                    }
                },
                deliveryAddresses: {
                    where: { isDeleted: false },
                    select: {
                        id: true,
                        address: true,
                        city: true,
                        state: true,
                        isDefault: true,
                    }
                },
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        const isSeller = !!user.sellerKyc;
        const userType = isSeller ? 'SELLER' : 'BUYER';
        let userStatus = 'ACTIVE';
        if (user.sellerKyc) {
            switch (user.sellerKyc.status) {
                case 'PENDING':
                    userStatus = 'PENDING';
                    break;
                case 'REJECTED':
                    userStatus = 'SUSPENDED';
                    break;
                case 'SUSPENDED':
                    userStatus = 'SUSPENDED';
                    break;
                case 'APPROVED':
                    userStatus = 'ACTIVE';
                    break;
            }
        }
        const transformedUser = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            email: null,
            type: userType,
            status: userStatus,
            joinDate: user.createdAt,
            lastActive: user.updatedAt,
            kycStatus: user.sellerKyc?.status || null,
            kycVerifiedAt: user.sellerKyc?.verifiedAt || null,
            businessName: user.sellerKyc?.businessName || null,
            businessType: user.sellerKyc?.businessType || null,
            products: user.products,
            orders: user.orders_orders_userIdToUser,
            sellerOrders: user.orders_orders_sellerIdToUser,
            settlements: user.settlements,
            deliveryAddresses: user.deliveryAddresses,
            kycDetails: user.sellerKyc ? {
                id: user.sellerKyc.id,
                businessName: user.sellerKyc.businessName,
                businessType: user.sellerKyc.businessType,
                registrationNumber: user.sellerKyc.registrationNumber,
                taxId: user.sellerKyc.taxId,
                address: user.sellerKyc.address,
                city: user.sellerKyc.city,
                state: user.sellerKyc.state,
                postalCode: user.sellerKyc.postalCode,
                country: user.sellerKyc.country,
                documentType: user.sellerKyc.documentType,
                documentNumber: user.sellerKyc.documentNumber,
                documentUrl: transformDocumentUrl(user.sellerKyc.documentUrl),
                documentExpiryDate: user.sellerKyc.documentExpiryDate,
                status: user.sellerKyc.status,
                rejectionReason: user.sellerKyc.rejectionReason,
                verifiedAt: user.sellerKyc.verifiedAt,
                createdAt: user.sellerKyc.createdAt,
                statusChangedBy: user.sellerKyc.statusChangedBy,
                statusChangedAt: user.sellerKyc.statusChangedAt,
                bankAccounts: user.sellerKyc.bankAccounts,
                wallets: user.sellerKyc.wallets,
            } : null,
        };
        res.json({
            success: true,
            data: transformedUser,
        });
    }
    catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.put('/:id/kyc', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;
        const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be one of: PENDING, APPROVED, REJECTED, SUSPENDED',
            });
        }
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                sellerKyc: true,
            },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        if (!user.sellerKyc) {
            return res.status(404).json({
                success: false,
                error: 'User does not have KYC information',
            });
        }
        const updateData = {
            status,
            updatedAt: new Date(),
            statusChangedBy: req.user.username,
            statusChangedAt: new Date(),
        };
        if (status === 'APPROVED') {
            updateData.verifiedAt = new Date();
            updateData.rejectionReason = null;
        }
        if (status === 'REJECTED' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
            updateData.verifiedAt = null;
        }
        if (status === 'SUSPENDED' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
            updateData.verifiedAt = null;
        }
        if (status === 'SUSPENDED' && !rejectionReason) {
            updateData.rejectionReason = null;
            updateData.verifiedAt = null;
        }
        const updatedKyc = await prisma.sellerKyc.update({
            where: { userId: id },
            data: updateData,
        });
        res.json({
            success: true,
            data: updatedKyc,
            message: `KYC status updated to ${status}`,
        });
    }
    catch (error) {
        console.error('Update KYC error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/revenue/platform', auth_1.authenticate, async (req, res) => {
    try {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const serviceFeeTransactions = await prisma.externalTransaction.findMany({
            where: {
                transactionType: 'SERVICE_FEE',
                currencyCode: 'GMD',
                status: 'SUCCESS',
                createdAt: {
                    gte: currentMonthStart,
                    lte: currentMonthEnd,
                },
            },
            select: {
                amount: true,
                createdAt: true,
            }
        });
        const totalServiceFees = serviceFeeTransactions.reduce((sum, transaction) => {
            return sum + Number(transaction.amount);
        }, 0);
        const serviceFeeRate = await prisma.uCP.findFirst({
            where: {
                name: 'service_fee_gmd',
                isActive: true,
            },
            select: {
                value: true,
            }
        });
        res.json({
            success: true,
            data: {
                totalServiceFees,
                serviceFeeRate: serviceFeeRate?.value || 0.05,
                transactionCount: serviceFeeTransactions.length,
                currency: 'GMD',
                currentMonth: currentMonthName,
            },
        });
    }
    catch (error) {
        console.error('Get platform revenue error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map