import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// @route   GET /api/settlements/cumulative-entries
// @desc    Get cumulative financial entries grouped by currency
// @access  Private
router.get('/cumulative-entries', authenticate, async (req: any, res) => {
  try {
    const { dateFrom, dateTo, currency } = req.query;

    // Build date filter
    const dateFilter: any = {};
    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom as string);
    }
    if (dateTo) {
      dateFilter.lte = new Date(dateTo as string);
    }

    // Build currency filter
    const currencyFilter = currency ? { currencyCode: currency } : {};

    // Get all settlements
    const settlements = await prisma.settlement.findMany({
      where: {
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        currency: currency || undefined,
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
      }
    });

    // Get all orders with financial data
    const orders = await prisma.order.findMany({
      where: {
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        ...currencyFilter,
      },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        }
      }
    });

    // Get all external transactions
    const externalTransactions = await prisma.externalTransaction.findMany({
      where: {
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        ...currencyFilter,
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
      }
    });
    
    // Log transaction types breakdown
    const transactionTypes = externalTransactions.reduce((acc: any, t) => {
      acc[t.transactionType] = (acc[t.transactionType] || 0) + 1;
      return acc;
    }, {});

    // Group by currency and calculate totals
    const currencyGroups: { [key: string]: any } = {};

    // Process settlements (DR - Debit)
    settlements.forEach(settlement => {
      const currency = settlement.currency;
      if (!currencyGroups[currency]) {
        currencyGroups[currency] = {
          currency,
          debits: {
            settlementRequests: 0,
            discounts: 0,
            tax: 0,
            shippingAmount: 0,
            totalAmount: 0,
            fee: 0,
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

    // Process orders (DR - Debit)
    orders.forEach(order => {
      const currency = order.currencyCode;
      if (!currencyGroups[currency]) {
        currencyGroups[currency] = {
          currency,
          debits: {
            settlementRequests: 0,
            discounts: 0,
            tax: 0,
            shippingAmount: 0,
            totalAmount: 0,
            fee: 0,
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
      
      currencyGroups[currency].debits.discounts += Number(order.discountAmount);
      currencyGroups[currency].debits.tax += Number(order.taxAmount);
      currencyGroups[currency].debits.shippingAmount += Number(order.shippingAmount);
      currencyGroups[currency].debits.totalAmount += Number(order.totalAmount);
      currencyGroups[currency].details.orders.push(order);
    });

    // Process external transactions
    externalTransactions.forEach(transaction => {
      const currency = transaction.currencyCode;
      
      if (!currencyGroups[currency]) {
        currencyGroups[currency] = {
          currency,
          debits: {
            settlementRequests: 0,
            discounts: 0,
            tax: 0,
            shippingAmount: 0,
            totalAmount: 0,
            fee: 0,
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

    // Calculate totals for each currency
    Object.keys(currencyGroups).forEach(currency => {
      const group = currencyGroups[currency];
      
      // Calculate total debits
      group.totalDebits = Object.values(group.debits).reduce((sum: number, value: any) => sum + value, 0);
      
      // Calculate total credits
      group.totalCredits = Object.values(group.credits).reduce((sum: number, value: any) => sum + value, 0);
      
      // Calculate net position (Debits - Credits)
      group.netPosition = group.totalDebits - group.totalCredits;
    });

    // Convert to array and sort by currency
    const result = Object.values(currencyGroups).sort((a: any, b: any) => a.currency.localeCompare(b.currency));

    res.json({
      success: true,
      data: result,
      summary: {
        totalCurrencies: result.length,
        totalDebits: result.reduce((sum: number, group: any) => sum + group.totalDebits, 0),
        totalCredits: result.reduce((sum: number, group: any) => sum + group.totalCredits, 0),
        netPosition: result.reduce((sum: number, group: any) => sum + group.netPosition, 0),
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/settlements
// @desc    Get all settlements with filtering and pagination
// @access  Private
router.get('/', authenticate, async (req: any, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      type = 'all',
      currency = 'all',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { user: { 
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } }
          ]
        }},
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
        where.createdAt.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo as string);
      }
    }

    // Get total count
    const total = await prisma.settlement.count({ where });
    const totalPages = Math.ceil(total / limitNum);

    // Get paginated data
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/settlements/:id
// @desc    Get single settlement with full details
// @access  Private
router.get('/:id', authenticate, async (req: any, res) => {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   PUT /api/settlements/:id/status
// @desc    Update settlement status
// @access  Private
router.put('/:id/status', authenticate, async (req: any, res) => {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router; 