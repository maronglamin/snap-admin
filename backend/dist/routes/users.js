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
        const { page = 1, limit = 10, search = '', status = 'all', type = 'all', kycStatus = 'all', hasKYC = false } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (hasKYC === 'true') {
            where.sellerKyc = {
                isNot: null
            };
        }
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
                orders: {
                    select: {
                        id: true,
                        status: true,
                        totalAmount: true,
                        currencyCode: true,
                        createdAt: true,
                    }
                },
                sellerOrders: {
                    select: {
                        id: true,
                        status: true,
                        totalAmount: true,
                        currencyCode: true,
                        createdAt: true,
                    }
                },
                settlements: {
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                    }
                },
            },
            orderBy: { createdAt: 'desc' },
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
        let filteredTransformedUsers = allTransformedUsers;
        if (status !== 'all') {
            filteredTransformedUsers = filteredTransformedUsers.filter(user => user.status === status);
        }
        if (type !== 'all') {
            filteredTransformedUsers = filteredTransformedUsers.filter(user => user.type === type);
        }
        if (kycStatus !== 'all') {
            filteredTransformedUsers = filteredTransformedUsers.filter(user => user.kycStatus === kycStatus);
        }
        const totalFiltered = filteredTransformedUsers.length;
        const totalPages = Math.ceil(totalFiltered / limitNum);
        const paginatedUsers = filteredTransformedUsers.slice(skip, skip + limitNum);
        const transformedUsers = paginatedUsers.map(({ user, type: userType, status: userStatus, kycStatus }) => {
            const totalProducts = user.products.filter(p => p.status === 'ACTIVE').length;
            const totalOrders = user.orders.length;
            const totalSettlements = user.settlements.filter(s => s.status === 'COMPLETED').length;
            let totalSales = 0;
            let totalSpent = 0;
            let latestCurrency = null;
            let allCurrencies = [];
            let currencyTotals = {};
            if (userType === 'SELLER' && user.sellerOrders.length > 0) {
                allCurrencies = [...new Set(user.sellerOrders.map(order => order.currencyCode))];
                currencyTotals = user.sellerOrders.reduce((acc, order) => {
                    const currency = order.currencyCode;
                    if (!acc[currency]) {
                        acc[currency] = 0;
                    }
                    acc[currency] += Number(order.totalAmount);
                    return acc;
                }, {});
                const latestOrder = user.sellerOrders.reduce((latest, order) => new Date(order.createdAt) > new Date(latest.createdAt) ? order : latest);
                latestCurrency = latestOrder.currencyCode;
                totalSales = currencyTotals[latestCurrency] || 0;
            }
            if (userType === 'BUYER' && user.orders.length > 0) {
                allCurrencies = [...new Set(user.orders.map(order => order.currencyCode))];
                currencyTotals = user.orders.reduce((acc, order) => {
                    const currency = order.currencyCode;
                    if (!acc[currency]) {
                        acc[currency] = 0;
                    }
                    acc[currency] += Number(order.totalAmount);
                    return acc;
                }, {});
                const latestOrder = user.orders.reduce((latest, order) => new Date(order.createdAt) > new Date(latest.createdAt) ? order : latest);
                latestCurrency = latestOrder.currencyCode;
                totalSpent = currencyTotals[latestCurrency] || 0;
            }
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
                totalOrders,
                totalSales,
                totalSpent,
                totalSettlements,
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
                        status: true,
                        createdAt: true,
                    }
                },
                orders: {
                    select: {
                        id: true,
                        orderNumber: true,
                        totalAmount: true,
                        status: true,
                        createdAt: true,
                    }
                },
                sellerOrders: {
                    select: {
                        id: true,
                        orderNumber: true,
                        totalAmount: true,
                        status: true,
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
            orders: user.orders,
            sellerOrders: user.sellerOrders,
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
        console.log('KYC Update Request:', { id, status, rejectionReason });
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
        console.log('Update Data:', updateData);
        const updatedKyc = await prisma.sellerKyc.update({
            where: { userId: id },
            data: updateData,
        });
        console.log('Updated KYC:', updatedKyc);
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
        const serviceFeeTransactions = await prisma.externalTransaction.findMany({
            where: {
                transactionType: 'SERVICE_FEE',
                currencyCode: 'GMD',
                status: 'SUCCESS',
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