import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { AuthenticatedRequest } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Get all rides with pagination
router.get('/', authenticate, requirePermission('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 10, status, rideType, paymentStatus, search, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (rideType) {
      where.rideType = rideType;
    }
    
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }
    
    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        // Set end date to end of day (23:59:59)
        const endDateTime = new Date(endDate as string);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }
    
    if (search) {
      where.OR = [
        { rideId: { contains: search as string, mode: 'insensitive' } },
        { customer: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search as string, mode: 'insensitive' } } },
        { customer: { phoneNumber: { contains: search as string, mode: 'insensitive' } } },
        { driver: { driverId: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [rides, total] = await Promise.all([
      prisma.ride.findMany({
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
          rideRequest: {
            select: {
              id: true,
              requestId: true,
              requestedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.ride.count({ where }),
    ]);

    res.json({
      rides,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

// Export rides to CSV
router.get('/export', authenticate, requirePermission('SNAP_RIDE_RIDE_MANAGEMENT', 'EXPORT'), async (req: AuthenticatedRequest, res) => {
  try {
    const { status, rideType, paymentStatus, search, startDate, endDate } = req.query;

    // Build where clause (same as main endpoint)
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (rideType) {
      where.rideType = rideType;
    }
    
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }
    
    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        // Set end date to end of day (23:59:59)
        const endDateTime = new Date(endDate as string);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }
    
    if (search) {
      where.OR = [
        { rideId: { contains: search as string, mode: 'insensitive' } },
        { customer: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search as string, mode: 'insensitive' } } },
        { customer: { phoneNumber: { contains: search as string, mode: 'insensitive' } } },
        { driver: { driverId: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    // Get all rides matching the filters (no pagination for export)
    const rides = await prisma.ride.findMany({
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
        rideRequest: {
          select: {
            id: true,
            requestId: true,
            requestedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert to CSV format
    const csvHeaders = [
      'Ride ID',
      'Status',
      'Ride Type',
      'Total Fare',
      'Driver Earnings',
      'Platform Fee',
      'Payment Method',
      'Payment Status',
      'Customer Name',
      'Customer Phone',
      'Driver ID',
      'Driver Name',
      'Driver Phone',
      'Request ID',
      'Requested At',
      'Started At',
      'Completed At',
      'Created At',
    ];

    const csvRows = rides.map(ride => [
      ride.rideId,
      ride.status,
      ride.rideType,
      ride.totalFare.toString(),
      ride.driverEarnings.toString(),
      ride.platformFee.toString(),
      ride.paymentMethod,
      ride.paymentStatus,
      `${ride.customer.firstName} ${ride.customer.lastName}`,
      ride.customer.phoneNumber,
      ride.driver.driverId,
      `${ride.driver.user.firstName} ${ride.driver.user.lastName}`,
      ride.driver.user.phoneNumber,
      ride.rideRequest.requestId,
      ride.rideRequest.requestedAt,
      ride.startedAt || '',
      ride.completedAt || '',
      ride.createdAt,
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ride-management-export-${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting rides:', error);
    res.status(500).json({ error: 'Failed to export rides' });
  }
});

// Get ride by ID
router.get('/:id', authenticate, requirePermission('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const ride = await prisma.ride.findUnique({
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
        rideRequest: {
          select: {
            id: true,
            requestId: true,
            requestedAt: true,
            expiresAt: true,
          },
        },
        locationUpdates: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
            accuracy: true,
            speed: true,
            heading: true,
            timestamp: true,
          },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    res.json(ride);
  } catch (error) {
    console.error('Error fetching ride:', error);
    res.status(500).json({ error: 'Failed to fetch ride' });
  }
});

// Get ride statistics
router.get('/stats/overview', authenticate, requirePermission('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const [
      totalRides,
      completedRides,
      cancelledRides,
      totalRevenue,
      totalDriverEarnings,
      totalPlatformFees,
      todayRides,
      thisWeekRides,
      thisMonthRides,
    ] = await Promise.all([
      prisma.ride.count(),
      prisma.ride.count({ where: { status: 'COMPLETED' } }),
      prisma.ride.count({ where: { status: 'CANCELLED' } }),
      prisma.ride.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalFare: true },
      }),
      prisma.ride.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { driverEarnings: true },
      }),
      prisma.ride.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { platformFee: true },
      }),
      prisma.ride.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.ride.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
      }),
      prisma.ride.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    res.json({
      totalRides,
      completedRides,
      cancelledRides,
      cancellationRate: totalRides > 0 ? (cancelledRides / totalRides) * 100 : 0,
      totalRevenue: totalRevenue._sum.totalFare || 0,
      totalDriverEarnings: totalDriverEarnings._sum.driverEarnings || 0,
      totalPlatformFees: totalPlatformFees._sum.platformFee || 0,
      todayRides,
      thisWeekRides,
      thisMonthRides,
    });
  } catch (error) {
    console.error('Error fetching ride statistics:', error);
    res.status(500).json({ error: 'Failed to fetch ride statistics' });
  }
});

// Get rides by status
router.get('/stats/by-status', authenticate, requirePermission('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const statusCounts = await prisma.ride.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const statusData = statusCounts.map(item => ({
      status: item.status,
      count: item._count.status,
    }));

    res.json(statusData);
  } catch (error) {
    console.error('Error fetching status statistics:', error);
    res.status(500).json({ error: 'Failed to fetch status statistics' });
  }
});

// Get rides by type
router.get('/stats/by-type', authenticate, requirePermission('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const typeCounts = await prisma.ride.groupBy({
      by: ['rideType'],
      _count: {
        rideType: true,
      },
    });

    const typeData = typeCounts.map(item => ({
      rideType: item.rideType,
      count: item._count.rideType,
    }));

    res.json(typeData);
  } catch (error) {
    console.error('Error fetching type statistics:', error);
    res.status(500).json({ error: 'Failed to fetch type statistics' });
  }
});

// Get rides by payment method
router.get('/stats/by-payment-method', authenticate, requirePermission('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const paymentMethodCounts = await prisma.ride.groupBy({
      by: ['paymentMethod'],
      _count: {
        paymentMethod: true,
      },
    });

    const paymentMethodData = paymentMethodCounts.map(item => ({
      paymentMethod: item.paymentMethod,
      count: item._count.paymentMethod,
    }));

    res.json(paymentMethodData);
  } catch (error) {
    console.error('Error fetching payment method statistics:', error);
    res.status(500).json({ error: 'Failed to fetch payment method statistics' });
  }
});

// Get revenue analytics
router.get('/stats/revenue', authenticate, requirePermission('SNAP_RIDE_RIDE_MANAGEMENT', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const [
      totalRevenue,
      driverEarnings,
      platformFees,
      revenueByDay,
      averageFare,
      averageDriverEarnings,
    ] = await Promise.all([
      // Total revenue in period
      prisma.ride.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: { totalFare: true },
      }),
      // Total driver earnings in period
      prisma.ride.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: { driverEarnings: true },
      }),
      // Total platform fees in period
      prisma.ride.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: { platformFee: true },
      }),
      // Revenue by day
      prisma.ride.groupBy({
        by: ['createdAt'],
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: {
          totalFare: true,
          driverEarnings: true,
          platformFee: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      // Average fare
      prisma.ride.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _avg: { totalFare: true },
      }),
      // Average driver earnings
      prisma.ride.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _avg: { driverEarnings: true },
      }),
    ]);

    res.json({
      period: Number(period),
      totalRevenue: totalRevenue._sum.totalFare || 0,
      driverEarnings: driverEarnings._sum.driverEarnings || 0,
      platformFees: platformFees._sum.platformFee || 0,
      averageFare: averageFare._avg.totalFare || 0,
      averageDriverEarnings: averageDriverEarnings._avg.driverEarnings || 0,
      revenueByDay: revenueByDay.map(item => ({
        date: item.createdAt,
        totalFare: item._sum.totalFare || 0,
        driverEarnings: item._sum.driverEarnings || 0,
        platformFee: item._sum.platformFee || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

export default router; 