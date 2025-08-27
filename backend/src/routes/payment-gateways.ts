import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// @route   GET /api/payment-gateways
// @desc    Get all payment gateway service providers with pagination and filters
// @access  Private
router.get('/', authenticate, async (req: any, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      type = 'all',
      countryCode = 'all',
      currencyCode = 'all',
      status = 'all'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Add type filter
    if (type && type !== 'all') {
      where.type = type;
    }

    // Add country code filter
    if (countryCode && countryCode !== 'all') {
      where.countryCode = countryCode;
    }

    // Add currency code filter
    if (currencyCode && currencyCode !== 'all') {
      where.currencyCode = currencyCode;
    }

    // Add status filter
    if (status && status !== 'all') {
      where.isActive = status === 'active';
    }

    // Get total count
    const total = await prisma.paymentGatewayServiceProvider.count({ where });

    // Get paginated data
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
  } catch (error) {
    console.error('Get payment gateways error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});



// @route   POST /api/payment-gateways
// @desc    Create new payment gateway service provider
// @access  Private
router.post('/', authenticate, async (req: any, res) => {
  try {
    const {
      name,
      type,
      countryCode,
      currencyCode,
      description,
      logoUrl,
      metadata,
      isActive = true,
    } = req.body;

    // Validate required fields
    if (!name || !type || !countryCode || !currencyCode) {
      return res.status(400).json({
        success: false,
        error: 'Name, type, country code, and currency code are required',
      });
    }

    // Check if payment gateway with same name and country code already exists
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
        createdBy: req.user.username, // Track who created this payment gateway
      },
    });

    res.status(201).json({
      success: true,
      data: paymentGateway,
    });
  } catch (error) {
    console.error('Create payment gateway error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   PUT /api/payment-gateways/:id
// @desc    Update payment gateway service provider
// @access  Private
router.put('/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      countryCode,
      currencyCode,
      description,
      logoUrl,
      metadata,
      isActive,
    } = req.body;

    // Check if payment gateway exists
    const existingGateway = await prisma.paymentGatewayServiceProvider.findUnique({
      where: { id },
    });

    if (!existingGateway) {
      return res.status(404).json({
        success: false,
        error: 'Payment gateway not found',
      });
    }

    // If name or country code is being changed, check for duplicates
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
  } catch (error) {
    console.error('Update payment gateway error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   DELETE /api/payment-gateways/:id
// @desc    Delete payment gateway service provider
// @access  Private
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;

    // Check if payment gateway exists
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
  } catch (error) {
    console.error('Delete payment gateway error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/payment-gateways/types
// @desc    Get all unique payment gateway types
// @access  Private
router.get('/types', authenticate, async (req: any, res) => {
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
  } catch (error) {
    console.error('Get payment gateway types error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/payment-gateways/countries
// @desc    Get all unique country codes
// @access  Private
router.get('/countries', authenticate, async (req: any, res) => {
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
  } catch (error) {
    console.error('Get payment gateway countries error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/payment-gateways/currencies
// @desc    Get all unique currency codes
// @access  Private
router.get('/currencies', authenticate, async (req: any, res) => {
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
  } catch (error) {
    console.error('Get payment gateway currencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/payment-gateways/:id
// @desc    Get single payment gateway service provider
// @access  Private
router.get('/:id', authenticate, async (req: any, res) => {
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
  } catch (error) {
    console.error('Get payment gateway by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router; 