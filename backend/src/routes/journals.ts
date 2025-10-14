import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// @route   GET /api/journals/stripe-payments
// @desc    Get Stripe payment transactions with related data
// @access  Private
router.get('/stripe-payments', authenticate, async (req: any, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      dateFrom = '',
      dateTo = '',
      transactionType = 'all'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for external transactions
    const where: any = {
      gatewayProvider: 'stripe'
    };

    // Add type filter - handle both initial filter and specific type
    if (transactionType && transactionType !== 'all') {
      where.transactionType = transactionType;
    } else {
      // Default filter for ORIGINAL and FEE types
      where.transactionType = {
        in: ['ORIGINAL', 'FEE']
      };
    }

    // Add search filter
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

    // Add status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom as string);
        where.createdAt.gte = startDate;
      }
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        where.createdAt.lte = endDate;
      }
    }

    // Get total count
    const total = await prisma.externalTransaction.count({ where });
    const totalPages = Math.ceil(total / limitNum);

    // Get paginated data with related information
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
  } catch (error) {
    console.error('Get Stripe payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/journals/stripe-payments/export
// @desc    Export all Stripe payment transactions with current filters (no pagination)
// @access  Private
router.get('/stripe-payments/export', authenticate, async (req: any, res) => {
  try {
    const { 
      search = '', 
      status = 'all',
      dateFrom = '',
      dateTo = '',
      transactionType = 'all'
    } = req.query;

    // Build where clause for external transactions
    const where: any = {
      gatewayProvider: 'stripe'
    };

    // Add type filter - handle both initial filter and specific type
    if (transactionType && transactionType !== 'all') {
      where.transactionType = transactionType;
    } else {
      // Default filter for ORIGINAL and FEE types
      where.transactionType = {
        in: ['ORIGINAL', 'FEE']
      };
    }

    // Add search filter
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

    // Add status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom as string);
        where.createdAt.gte = startDate;
      }
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        where.createdAt.lte = endDate;
      }
    }

    // Get all data with related information (no pagination for export)
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
  } catch (error) {
    console.error('Export Stripe payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/journals/stripe-payments/:id
// @desc    Get single Stripe payment transaction with full details
// @access  Private
router.get('/stripe-payments/:id', authenticate, async (req: any, res) => {
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
  } catch (error) {
    console.error('Get Stripe payment by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/journals/snap-fees
// @desc    Get Snap fee transactions with related data
// @access  Private
router.get('/snap-fees', authenticate, async (req: any, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      dateFrom = '',
      dateTo = '',
      transactionType = 'all'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for external transactions - only SERVICE_FEE
    const where: any = {
      transactionType: 'SERVICE_FEE'
    };

    // Add search filter
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

    // Add status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom as string);
        where.createdAt.gte = startDate;
      }
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        where.createdAt.lte = endDate;
      }
    }

    // Get total count
    const total = await prisma.externalTransaction.count({ where });
    const totalPages = Math.ceil(total / limitNum);

    // Get paginated data with related information
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
  } catch (error) {
    console.error('Get Snap fees error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/journals/snap-fees/export
// @desc    Export all Snap fee transactions with current filters (no pagination)
// @access  Private
router.get('/snap-fees/export', authenticate, async (req: any, res) => {
  try {
    const { 
      search = '', 
      status = 'all',
      dateFrom = '',
      dateTo = '',
      transactionType = 'all'
    } = req.query;

    // Build where clause for external transactions - only SERVICE_FEE
    const where: any = {
      transactionType: 'SERVICE_FEE'
    };

    // Add search filter
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

    // Add status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom as string);
        where.createdAt.gte = startDate;
      }
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        where.createdAt.lte = endDate;
      }
    }

    // Get all data with related information (no pagination for export)
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
  } catch (error) {
    console.error('Export Snap fees error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/journals/snap-fees/:id
// @desc    Get single Snap fee transaction with full details
// @access  Private
router.get('/snap-fees/:id', authenticate, async (req: any, res) => {
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

    // Verify it's a SERVICE_FEE transaction
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
  } catch (error) {
    console.error('Get Snap fee by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/journals/audit
// @desc    Get all transaction types for audit (ORIGINAL, FEE, SERVICE_FEE)
// @access  Private
router.get('/audit', authenticate, async (req: any, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      dateFrom = '',
      dateTo = '',
      transactionType = 'all'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for external transactions - include all types
    const where: any = {
      transactionType: {
        in: ['ORIGINAL', 'FEE', 'SERVICE_FEE']
      }
    };

    // Add specific type filter if provided
    if (transactionType && transactionType !== 'all') {
      where.transactionType = transactionType;
    }

    // Add search filter
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

    // Add status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom as string);
        where.createdAt.gte = startDate;
      }
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        where.createdAt.lte = endDate;
      }
    }

    // Get total count
    const total = await prisma.externalTransaction.count({ where });
    const totalPages = Math.ceil(total / limitNum);

    // Get paginated data with related information
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
  } catch (error) {
    console.error('Get audit transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/journals/audit/export
// @desc    Export all audit transactions with current filters (no pagination)
// @access  Private
router.get('/audit/export', authenticate, async (req: any, res) => {
  try {
    const { 
      search = '', 
      status = 'all',
      dateFrom = '',
      dateTo = '',
      transactionType = 'all'
    } = req.query;

    // Build where clause for external transactions - include all types
    const where: any = {
      transactionType: {
        in: ['ORIGINAL', 'FEE', 'SERVICE_FEE']
      }
    };

    // Add specific type filter if provided
    if (transactionType && transactionType !== 'all') {
      where.transactionType = transactionType;
    }

    // Add search filter
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

    // Add status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom as string);
        where.createdAt.gte = startDate;
      }
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        where.createdAt.lte = endDate;
      }
    }

    // Get all data with related information (no pagination for export)
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
  } catch (error) {
    console.error('Export audit transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/journals/audit/:id
// @desc    Get single audit transaction with full details
// @access  Private
router.get('/audit/:id', authenticate, async (req: any, res) => {
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

    // Verify it's one of the audit transaction types
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
  } catch (error) {
    console.error('Get audit transaction by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router; 
