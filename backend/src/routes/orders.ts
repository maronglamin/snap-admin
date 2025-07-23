import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// @route   GET /api/orders/count
// @desc    Get total count of orders for debugging
// @access  Private
router.get('/count', authenticate, async (req: any, res) => {
  try {
    const total = await prisma.order.count();
    console.log('Total Orders in Database:', total);
    
    res.json({
      success: true,
      total,
      message: 'Total orders count retrieved successfully',
    });
  } catch (error) {
    console.error('Get orders count error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/orders
// @desc    Get all orders with filtering, search, and pagination
// @access  Private
router.get('/', authenticate, async (req: any, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      paymentStatus = 'all',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    console.log('Orders API Query Parameters:', {
      page,
      limit,
      search,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
    });

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for orders
    const where: any = {};

    // Add search filter
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { totalAmount: { equals: parseFloat(search) || undefined } },
        { user: { 
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } }
          ]
        }},
        { seller: { 
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } }
          ]
        }},
      ];
    }

    // Add status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Add payment status filter
    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus;
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom as string);
        where.createdAt.gte = startDate;
        console.log('Date From Filter:', startDate);
      }
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        where.createdAt.lte = endDate;
        console.log('Date To Filter:', endDate);
      }
    }

    console.log('Final Where Clause:', JSON.stringify(where, null, 2));

    // Get total count
    const total = await prisma.order.count({ where });
    const totalPages = Math.ceil(total / limitNum);

    console.log('Total Orders Found:', total);
    console.log('Total Pages:', totalPages);
    console.log('Current Page:', pageNum);
    console.log('Limit:', limitNum);
    console.log('Skip:', skip);

    // Get total count without any filters for debugging
    const totalWithoutFilters = await prisma.order.count();
    console.log('Total Orders in Database (no filters):', totalWithoutFilters);

    // Get paginated data with related information
    const orders = await prisma.order.findMany({
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
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        orderItems: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            status: true,
            productSnapshot: true,
            createdAt: true,
            updatedAt: true,
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                currencyCode: true,
              }
            }
          }
        },
        externalTransactions: {
          select: {
            id: true,
            appTransactionId: true,
            amount: true,
            status: true,
            transactionType: true,
            gatewayProvider: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    res.json({
      success: true,
      data: orders,
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
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/orders/export
// @desc    Export all orders with current filters (no pagination)
// @access  Private
router.get('/export', authenticate, async (req: any, res) => {
  try {
    const { 
      search = '', 
      status = 'all',
      paymentStatus = 'all',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    // Build where clause for orders
    const where: any = {};

    // Add search filter
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { totalAmount: { equals: parseFloat(search) || undefined } },
        { user: { 
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } }
          ]
        }},
        { seller: { 
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } }
          ]
        }},
      ];
    }

    // Add status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Add payment status filter
    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus;
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
    const orders = await prisma.order.findMany({
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
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                currencyCode: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: orders,
      total: orders.length,
    });
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order with full details
// @access  Private
router.get('/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
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
        },
        orderItems: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            status: true,
            productSnapshot: true,
            createdAt: true,
            updatedAt: true,
            product: {
              select: {
                id: true,
                title: true,
                description: true,
                price: true,
                currencyCode: true,
                condition: true,
                images: {
                  select: {
                    imageUrl: true,
                    isPrimary: true,
                  }
                }
              }
            }
          }
        },
        externalTransactions: {
          include: {
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
            },
            paymentMethod: true
          }
        }
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
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

    const order = await prisma.order.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date(),
        ...(status === 'SHIPPED' && { shippedAt: new Date() }),
        ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
        ...(status === 'CANCELLED' && { cancelledAt: new Date() }),
      },
      include: {
        user: {
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
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                currencyCode: true,
              }
            }
          }
        },
      },
    });

    res.json({
      success: true,
      data: order,
      message: 'Order status updated successfully',
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router; 