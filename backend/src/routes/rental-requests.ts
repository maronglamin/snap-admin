import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { AuthenticatedRequest } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Get all rental requests with pagination
router.get('/', authenticate, requirePermission('SNAP_RENTAL', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 10, status, search, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        const endDateTime = new Date(endDate as string);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }
    
    if (search) {
      where.OR = [
        { requestId: { contains: search as string, mode: 'insensitive' } },
        { pickupAddress: { contains: search as string, mode: 'insensitive' } },
        { customer: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [rentalRequests, total] = await Promise.all([
      prisma.rentalRequest.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          driver: {
            select: {
              id: true,
              driverId: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                },
              },
            },
          },
          rideService: {
            select: {
              id: true,
              name: true,
              vehicleType: true,
              currency: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.rentalRequest.count({ where }),
    ]);

    res.json({
      rentalRequests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching rental requests:', error);
    res.status(500).json({ error: 'Failed to fetch rental requests' });
  }
});

// Get rental request by ID
router.get('/:id', authenticate, requirePermission('SNAP_RENTAL', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const rentalRequest = await prisma.rentalRequest.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        driver: {
          select: {
            id: true,
            driverId: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
        },
        rideService: {
          select: {
            id: true,
            name: true,
            vehicleType: true,
            currency: true,
          },
        },
        messages: {
          select: {
            id: true,
            content: true,
            senderType: true,
            createdAt: true,
            sender: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!rentalRequest) {
      return res.status(404).json({ error: 'Rental request not found' });
    }

    // Get external transactions for this rental request
    const externalTransactions = await prisma.externalTransaction.findMany({
      where: {
        rentalRequestId: id,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group transactions by type
    const paymentInfo = {
      original: externalTransactions.find(t => t.transactionType === 'ORIGINAL'),
      fee: externalTransactions.find(t => t.transactionType === 'FEE'),
      serviceFee: externalTransactions.find(t => t.transactionType === 'SERVICE_FEE'),
      allTransactions: externalTransactions,
    };

    res.json({ 
      success: true,
      rentalRequest: {
        ...rentalRequest,
        paymentInfo
      }
    });
  } catch (error) {
    console.error('Error fetching rental request:', error);
    res.status(500).json({ error: 'Failed to fetch rental request' });
  }
});

// Update rental request status
router.patch('/:id/status', authenticate, requirePermission('SNAP_RENTAL', 'EDIT'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const rentalRequest = await prisma.rentalRequest.update({
      where: { id },
      data: {
        status: status as any, // Cast to RentalRequestStatus enum
        notes: notes ? `${new Date().toISOString()}: ${notes}` : undefined,
      },
    });

    res.json({ rentalRequest });
  } catch (error) {
    console.error('Error updating rental request status:', error);
    res.status(500).json({ error: 'Failed to update rental request status' });
  }
});

// Export rental requests to CSV
router.get('/export/csv', authenticate, requirePermission('SNAP_RENTAL', 'EXPORT'), async (req: AuthenticatedRequest, res) => {
  try {
    const { status, search, startDate, endDate } = req.query;

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        const endDateTime = new Date(endDate as string);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }

    if (search) {
      where.OR = [
        { requestId: { contains: search as string, mode: 'insensitive' } },
        { pickupAddress: { contains: search as string, mode: 'insensitive' } },
        { customer: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const rentalRequests = await prisma.rentalRequest.findMany({
      where,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        driver: {
          select: {
            driverId: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
        },
        rideService: {
          select: {
            name: true,
            vehicleType: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform data for CSV export
    const csvData = rentalRequests.map((request) => ({
      requestId: request.requestId,
      customerName: `${request.customer.firstName} ${request.customer.lastName}`,
      customerPhone: request.customer.phoneNumber,
      driverName: request.driver ? `${request.driver.user.firstName} ${request.driver.user.lastName}` : 'N/A',
      driverPhone: request.driver ? request.driver.user.phoneNumber : 'N/A',
      rideService: request.rideService.name,
      vehicleType: request.rideService.vehicleType,
      status: request.status,
      pickupAddress: request.pickupAddress,
      startDate: request.startDate,
      endDate: request.endDate,
      days: request.days,
      proposedPrice: request.proposedPrice,
      agreedPrice: request.agreedPrice,
      currency: request.currency,
      createdAt: request.createdAt,
    }));

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=rental-requests-export.csv');

    // Convert to CSV
    const csvHeaders = [
      'Request ID',
      'Customer Name',
      'Customer Phone',
      'Driver Name',
      'Driver Phone',
      'Ride Service',
      'Vehicle Type',
      'Status',
      'Pickup Address',
      'Start Date',
      'End Date',
      'Days',
      'Proposed Price',
      'Agreed Price',
      'Currency',
      'Created At',
    ];

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => [
        row.requestId,
        `"${row.customerName}"`,
        row.customerPhone,
        `"${row.driverName}"`,
        row.driverPhone,
        `"${row.rideService}"`,
        row.vehicleType,
        row.status,
        `"${row.pickupAddress}"`,
        row.startDate,
        row.endDate,
        row.days,
        row.proposedPrice,
        row.agreedPrice,
        row.currency,
        row.createdAt,
      ].join(','))
    ].join('\n');

    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting rental requests:', error);
    res.status(500).json({ error: 'Failed to export rental requests' });
  }
});



export default router;
