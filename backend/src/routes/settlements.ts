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
    const { dateFrom, dateTo, currency, page = 1, limit = 1000 } = req.query;

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

    // Pagination parameters
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get settlements with pagination - only COMPLETED status
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

    // Get orders with pagination
    const orders = await (prisma as any).orders.findMany({
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

    // Get external transactions with pagination - only SUCCESS status
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
            gatewayFee: 0, // gateway fee from external transactions (FEE)
          },
          credits: {
            customerPayments: 0,
          },
          details: {
            settlements: [],
            orders: [],
            externalTransactions: [],
          },
          feeBreakdown: {
            serviceFee: 0,
            gatewayFee: 0,
          },
        };
      }
      
      currencyGroups[currency].debits.settlementRequests += Number(settlement.amount);
      currencyGroups[currency].details.settlements.push(settlement);
    });

    // Process orders (details only; do not include in credit/debit totals)
    orders.forEach(order => {
      const currency = order.currencyCode;
      if (!currencyGroups[currency]) {
        currencyGroups[currency] = {
          currency,
          debits: {
            settlementRequests: 0,
            gatewayFee: 0,
          },
          credits: {
            customerPayments: 0,
          },
          details: {
            settlements: [],
            orders: [],
            externalTransactions: [],
          },
          feeBreakdown: {
            serviceFee: 0,
            gatewayFee: 0,
          },
        };
      }
      
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
            gatewayFee: 0,
          },
          credits: {
            customerPayments: 0,
          },
          details: {
            settlements: [],
            orders: [],
            externalTransactions: [],
          },
          feeBreakdown: {
            serviceFee: 0,
            gatewayFee: 0,
          },
        };
      }
      
      const amount = Number(transaction.amount);
      
      switch (transaction.transactionType) {
        case 'ORIGINAL':
          // Customer payments should be on the credit side
          currencyGroups[currency].credits.customerPayments += amount;
          break;
        case 'FEE':
          // Track gateway fees for subtotal computation
          currencyGroups[currency].feeBreakdown.gatewayFee += amount;
          break;
        case 'SERVICE_FEE':
          // Track service fees for subtotal computation
          currencyGroups[currency].feeBreakdown.serviceFee += amount;
          break;
      }
      
      currencyGroups[currency].details.externalTransactions.push(transaction);
    });

    // Calculate totals for each currency
    Object.keys(currencyGroups).forEach(currency => {
      const group = currencyGroups[currency];
      
      // Compute fee breakdown
      const serviceFee = Number(group.feeBreakdown?.serviceFee || 0);
      const gatewayFee = Number(group.feeBreakdown?.gatewayFee || 0);
      // Debit should reflect gateway fees (from external transactions)
      group.debits.gatewayFee = gatewayFee;
      // Provide a closing balance per currency for convenience
      group.closingBalance = serviceFee - gatewayFee;

      // Calculate total debits
      group.totalDebits = Object.values(group.debits).reduce((sum: number, value: any) => sum + value, 0);
      
      // Calculate total credits
      group.totalCredits = Object.values(group.credits).reduce((sum: number, value: any) => sum + value, 0);
      
      // Calculate net position (Debits - Credits)
      group.netPosition = group.totalDebits - group.totalCredits;
    });

    // Convert to array and sort by currency
    const result = Object.values(currencyGroups).sort((a: any, b: any) => a.currency.localeCompare(b.currency));

    // Get total counts for pagination info
    const totalSettlements = await prisma.settlement.count({
      where: {
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        currency: currency || undefined,
        status: 'COMPLETED',
      }
    });

    const totalOrders = await (prisma as any).orders.count({
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
        totalDebits: result.find((group: any) => group.currency === 'GMD')?.totalDebits || 0,
        totalCredits: result.find((group: any) => group.currency === 'GMD')?.totalCredits || 0,
        netPosition: result.find((group: any) => group.currency === 'GMD')?.netPosition || 0,
        closingBalance: result.find((group: any) => group.currency === 'GMD')?.closingBalance || 0,
      }
    });
  } catch (error) {
    console.error('Error in cumulative-entries:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
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

// @route   PUT /api/settlements/bulk-update-status
// @desc    Bulk update settlement statuses
// @access  Private
router.put('/bulk-update-status', authenticate, async (req: any, res) => {
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

    // Update all settlements in a transaction
    const updatedSettlements = await prisma.$transaction(async (tx) => {
      const updates = await Promise.all(
        ids.map((id: string) =>
          tx.settlement.update({
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
          })
        )
      );
      return updates;
    });

    res.json({
      success: true,
      data: updatedSettlements,
      message: `Successfully updated ${updatedSettlements.length} settlement(s) to ${status}`,
    });
  } catch (error) {
    console.error('Bulk update settlement status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router; 