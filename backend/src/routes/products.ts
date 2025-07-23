import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// @route   GET /api/products/count
// @desc    Get total count of products for debugging
// @access  Private
router.get('/count', authenticate, async (req: any, res) => {
  try {
    const total = await prisma.product.count();
    console.log('Total Products in Database:', total);
    
    res.json({
      success: true,
      total,
      message: 'Total products count retrieved successfully',
    });
  } catch (error) {
    console.error('Get products count error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/products
// @desc    Get all products with filtering, search, and pagination
// @access  Private
router.get('/', authenticate, async (req: any, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      condition = 'all',
      categoryId = 'all',
      isFeatured = 'all',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    console.log('Products API Query Parameters:', {
      page,
      limit,
      search,
      status,
      condition,
      categoryId,
      isFeatured,
      dateFrom,
      dateTo,
    });

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for products
    const where: any = {};

    // Add search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { price: { equals: parseFloat(search) || undefined } },
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

    // Add condition filter
    if (condition && condition !== 'all') {
      where.condition = condition;
    }

    // Add category filter
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    // Add featured filter
    if (isFeatured && isFeatured !== 'all') {
      where.isFeatured = isFeatured === 'true';
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
    const total = await prisma.product.count({ where });
    const totalPages = Math.ceil(total / limitNum);

    console.log('Total Products Found:', total);
    console.log('Total Pages:', totalPages);
    console.log('Current Page:', pageNum);
    console.log('Limit:', limitNum);
    console.log('Skip:', skip);

    // Get total count without any filters for debugging
    const totalWithoutFilters = await prisma.product.count();
    console.log('Total Products in Database (no filters):', totalWithoutFilters);

    // Get paginated data with related information
    const products = await prisma.product.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        location: {
          select: {
            id: true,
            city: true,
            region: true,
            countryCode: true,
          }
        },
        images: {
          select: {
            id: true,
            imageUrl: true,
            isPrimary: true,
          },
          take: 1,
        },
        orderItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            status: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                totalAmount: true,
                createdAt: true,
              }
            }
          }
        },
        productViews: {
          select: {
            id: true,
            viewedAt: true,
          }
        },
        productOrderInterests: {
          select: {
            id: true,
            quantity: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    res.json({
      success: true,
      data: products,
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
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/products/export
// @desc    Export all products with current filters (no pagination)
// @access  Private
router.get('/export', authenticate, async (req: any, res) => {
  try {
    const { 
      search = '', 
      status = 'all',
      condition = 'all',
      categoryId = 'all',
      isFeatured = 'all',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    // Build where clause for products
    const where: any = {};

    // Add search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { price: { equals: parseFloat(search) || undefined } },
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

    // Add condition filter
    if (condition && condition !== 'all') {
      where.condition = condition;
    }

    // Add category filter
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    // Add featured filter
    if (isFeatured && isFeatured !== 'all') {
      where.isFeatured = isFeatured === 'true';
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
    const products = await prisma.product.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        images: {
          select: {
            id: true,
            imageUrl: true,
            isPrimary: true,
          },
          take: 1,
        },
        orderItems: {
          where: {
            order: {
              paymentStatus: {
                in: ['PAID', 'SETTLED']
              },
              createdAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999)
              }
            }
          },
          include: {
            order: {
              select: {
                id: true,
                status: true,
                paymentStatus: true,
                totalAmount: true,
                currencyCode: true,
              }
            }
          }
        },
        productViews: true
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: products,
      total: products.length,
    });
  } catch (error) {
    console.error('Export products error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product with full details
// @access  Private
router.get('/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          }
        },
        location: {
          select: {
            id: true,
            city: true,
            region: true,
            countryCode: true,
            latitude: true,
            longitude: true,
          }
        },
        images: {
          select: {
            id: true,
            imageUrl: true,
            isPrimary: true,
            width: true,
            height: true,
            altText: true,
          },
          orderBy: { isPrimary: 'desc' }
        },
        attributes: {
          select: {
            id: true,
            key: true,
            value: true,
            unit: true,
            isFilterable: true,
            order: true,
          },
          orderBy: { order: 'asc' }
        },
        deliveryOptions: {
          select: {
            id: true,
            deliveryType: true,
            name: true,
            description: true,
            price: true,
            currencyCode: true,
            estimatedDays: true,
            isDefault: true,
            isActive: true,
          }
        },
        orderItems: {
          where: {
            order: {
              paymentStatus: {
                in: ['PAID', 'SETTLED']
              },
              createdAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999)
              }
            }
          },
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            status: true,
            createdAt: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                paymentStatus: true,
                totalAmount: true,
                currencyCode: true,
                customerName: true,
                customerPhone: true,
                createdAt: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        productViews: {
          select: {
            id: true,
            viewedAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              }
            }
          },
          orderBy: { viewedAt: 'desc' },
          take: 10
        },
        productOrderInterests: {
          select: {
            id: true,
            quantity: true,
            originalPrice: true,
            discountPrice: true,
            totalAmount: true,
            currencyCode: true,
            status: true,
            notes: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   PUT /api/products/:id/status
// @desc    Update product status
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

    const product = await prisma.product.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date(),
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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        images: {
          select: {
            id: true,
            imageUrl: true,
            isPrimary: true,
          },
          take: 1,
        },
      },
    });

    res.json({
      success: true,
      data: product,
      message: 'Product status updated successfully',
    });
  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/products/categories
// @desc    Get all categories for filtering
// @access  Private
router.get('/categories', authenticate, async (req: any, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router; 