import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import config from '../config';

const router = Router();
const prisma = new PrismaClient();

// Helper function to transform document URL to use image server
const transformDocumentUrl = (documentUrl: string | null): string | null => {
  if (!documentUrl) return null;
  
  // If the URL is already a full URL, return as is
  if (documentUrl.startsWith('http://') || documentUrl.startsWith('https://')) {
    return documentUrl;
  }
  
  // If it's a relative path, prepend the image server URL
  return `${config.imageServer.url}${documentUrl.startsWith('/') ? '' : '/'}${documentUrl}`;
};

// @route   GET /api/users
// @desc    Get all users with KYC information and seller status
// @access  Private
router.get('/', authenticate, async (req: any, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      type = 'all',
      kycStatus = 'all',
      hasKYC = false,
      startDate,
      endDate
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for database query
    const where: any = {};
    const andConditions: any[] = [];
    const orConditions: any[] = [];

    // Search filter
    if (search) {
      andConditions.push({
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search, mode: 'insensitive' } },
        ]
      });
    }

    // Date range filter on createdAt (join date)
    if (startDate || endDate) {
      const createdAt: any = {};
      if (startDate) createdAt.gte = new Date(startDate as string);
      if (endDate) createdAt.lte = new Date(endDate as string);
      andConditions.push({ createdAt });
    }

    // KYC filter - only get users with KYC if requested
    if (hasKYC === 'true') {
      andConditions.push({ sellerKyc: { isNot: null } });
    }

    // Type filter
    if (type === 'BUYER') {
      andConditions.push({ sellerKyc: { is: null } });
    } else if (type === 'SELLER') {
      andConditions.push({ sellerKyc: { isNot: null } });
    }

    // KYC status filter
    if (kycStatus !== 'all' && type !== 'BUYER') {
      andConditions.push({ sellerKyc: { is: { status: kycStatus } } });
    }

    // Derived status filter
    if (status !== 'all') {
      if (status === 'ACTIVE') {
        if (type === 'SELLER') {
          andConditions.push({ sellerKyc: { is: { status: 'APPROVED' } } });
        } else if (type === 'BUYER') {
          andConditions.push({ sellerKyc: { is: null } });
        } else {
          orConditions.push({ sellerKyc: { is: null } });
          orConditions.push({ sellerKyc: { is: { status: 'APPROVED' } } });
        }
      } else if (status === 'PENDING') {
        andConditions.push({ sellerKyc: { is: { status: 'PENDING' } } });
      } else if (status === 'SUSPENDED') {
        andConditions.push({ sellerKyc: { is: { status: { in: ['REJECTED', 'SUSPENDED'] } } } });
      }
      // Note: 'INACTIVE' not mapped in current domain; leaving as no-op
    }

    if (andConditions.length > 0) {
      where.AND = [...(where.AND || []), ...andConditions];
    }
    if (orConditions.length > 0) {
      where.AND = [...(where.AND || []), { OR: orConditions }];
    }

    // Count filtered users
    const totalFiltered = await prisma.user.count({ where });

    // Get paginated users only (server-side pagination)
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

    // Transform all users to determine type and status
    const allTransformedUsers = allUsers.map(user => {
      const isSeller = !!user.sellerKyc;
      const userType = isSeller ? 'SELLER' : 'BUYER';
      
      // Calculate user status based on KYC and activity
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
        user, // Keep original user data for calculations
      };
    });

    const totalPages = Math.ceil(totalFiltered / limitNum);

    // Transform paginated users with detailed calculations
    const transformedUsers = allTransformedUsers.map(({ user, type: userType, status: userStatus, kycStatus }) => {
      // Calculate statistics with currency consideration
      const totalProducts = user.products.filter(p => p.status === 'ACTIVE').length;
      // Temporarily commented out due to schema issues
      // const totalOrders = user.orders.length;
      // const totalSettlements = user.settlements.filter(s => s.status === 'COMPLETED').length;

      // Calculate total sales/spent grouped by currency
      let totalSales = 0;
      let totalSpent = 0;
      let latestCurrency = null; // Don't default to GMD
      let allCurrencies = []; // Track all currencies for this user
      let currencyTotals = {}; // Track totals by currency

      // Temporarily commented out due to schema issues
      // if (userType === 'SELLER' && user.sellerOrders.length > 0) {
      //   // Get current month date range
      //   const now = new Date();
      //   const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      //   const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      //   
      //   // Filter orders to only include PAID or SETTLED orders for sellers in current month
      //   const paidOrders = user.sellerOrders.filter(order => {
      //     const orderDate = new Date(order.createdAt);
      //     const isPaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'SETTLED';
      //     const isCurrentMonth = orderDate >= startOfMonth && orderDate <= endOfMonth;
      //     return isPaid && isCurrentMonth;
      //   });
      //   
      //   // Get all unique currencies for this seller (only from paid orders in current month)
      //   allCurrencies = [...new Set(paidOrders.map(order => order.currencyCode))];
      //   
      //   // Group orders by currency and sum totals (only paid orders in current month)
      //   currencyTotals = paidOrders.reduce((acc, order) => {
      //     const currency = order.currencyCode;
      //     if (!acc[currency]) {
      //       acc[currency] = 0;
      //   }
      //     acc[currency] += Number(order.totalAmount);
      //     return acc;
      //   }, {});
      //   
      //   // Get the most recent paid order to determine primary currency
      //   const latestOrder = paidOrders.length > 0 
      //     ? paidOrders.reduce((latest, order) => 
      //         new Date(order.createdAt) > new Date(latest.createdAt) ? order : latest
      //       )
      //     : null;
      //   latestCurrency = latestOrder ? latestOrder.currencyCode : null;
      //   
      //   // Set total sales to the primary currency total
      //   totalSales = latestCurrency ? currencyTotals[latestCurrency] || 0 : 0;
      // }

      // Temporarily commented out due to schema issues
      // if (userType === 'BUYER' && user.orders.length > 0) {
      //   // Get current month date range
      //   const now = new Date();
      //   const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      //   const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      //   
      //   // Filter orders to only include orders in current month
      //   const currentMonthOrders = user.orders.filter(order => {
      //     const orderDate = new Date(order.createdAt);
      //     return orderDate >= startOfMonth && orderDate <= endOfMonth;
      //   });
      //   
      //   // Get all unique currencies for this buyer (only from current month orders)
      //   allCurrencies = [...new Set(currentMonthOrders.map(order => order.currencyCode))];
      //   
      //   // Group orders by currency and sum totals (only current month orders)
      //   currencyTotals = currentMonthOrders.reduce((acc, order) => {
      //     const currency = order.currencyCode;
      //     if (!acc[currency]) {
      //       acc[currency] = 0;
      //   }
      //     acc[currency] += Number(order.totalAmount);
      //     return acc;
      //   }, {});
      //   
      //   // Get the most recent order to determine primary currency
      //   const latestOrder = currentMonthOrders.length > 0 
      //     ? currentMonthOrders.reduce((latest, order) => 
      //         new Date(order.createdAt) > new Date(latest.createdAt) ? order : latest
      //       )
      //     : null;
      //   latestCurrency = latestOrder ? latestOrder.currencyCode : null;
      //   
      //   // Set total spent to the primary currency total
      //   totalSpent = latestCurrency ? currencyTotals[latestCurrency] || 0 : 0;
      // }

      // If no currency found, default to GMD
      if (!latestCurrency) {
        latestCurrency = 'GMD';
        currencyTotals = { GMD: 0 };
      }

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        email: null, // User model doesn't have email field
        type: userType,
        status: userStatus,
        joinDate: user.createdAt,
        lastActive: user.updatedAt,
        totalProducts,
        totalOrders: 0, // Temporarily set to 0 due to schema issues
        totalSales,
        totalSpent,
        totalSettlements: 0, // Temporarily set to 0 due to schema issues
        latestCurrency, // Add currency information
        allCurrencies, // Add all currencies for this user
        currencyTotals, // Add totals grouped by currency
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
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID with detailed information
// @access  Private
router.get('/:id', authenticate, async (req: any, res) => {
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

    // Transform user data
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
      email: null, // User model doesn't have email field
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
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   PUT /api/users/:id/kyc
// @desc    Update user KYC status
// @access  Private
router.put('/:id/kyc', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;



    // Validate status
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: PENDING, APPROVED, REJECTED, SUSPENDED',
      });
    }

    // Check if user exists and has KYC
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

    // Update KYC status
    const updateData: any = {
      status,
      updatedAt: new Date(),
      statusChangedBy: req.user.username, // Track who changed the status
      statusChangedAt: new Date(), // Track when the status was changed
    };

    // Set verifiedAt if approving
    if (status === 'APPROVED') {
      updateData.verifiedAt = new Date();
      updateData.rejectionReason = null; // Clear rejection reason when approving
    }

    // Set rejection reason if rejecting
    if (status === 'REJECTED' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
      updateData.verifiedAt = null; // Clear verification date when rejecting
    }

    // Set suspension reason if suspending
    if (status === 'SUSPENDED' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
      updateData.verifiedAt = null;
    }

    // Clear rejection reason if suspending without reason
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
  } catch (error) {
    console.error('Update KYC error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/users/revenue/platform
// @desc    Get platform revenue (service fees) in GMD for current month
// @access  Private
router.get('/revenue/platform', authenticate, async (req: any, res) => {
  try {
    // Get current month start and end dates
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get current month name
    const currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Get service fee transactions from ExternalTransaction table for current month only
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

    // Calculate total service fees for current month
    const totalServiceFees = serviceFeeTransactions.reduce((sum, transaction) => {
      return sum + Number(transaction.amount);
    }, 0);

    // Get service fee rate from UCP table
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
        serviceFeeRate: serviceFeeRate?.value || 0.05, // Default 5% if not configured
        transactionCount: serviceFeeTransactions.length,
        currency: 'GMD',
        currentMonth: currentMonthName,
      },
    });
  } catch (error) {
    console.error('Get platform revenue error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router; 