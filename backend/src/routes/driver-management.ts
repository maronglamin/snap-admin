import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { AuthenticatedRequest } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Get all drivers with pagination
router.get('/', authenticate, requirePermission('SNAP_RIDE_DRIVER_MANAGEMENT', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 10, status, isOnline, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (isOnline !== undefined) {
      where.isOnline = isOnline === 'true';
    }
    
    if (search) {
      where.OR = [
        { driverId: { contains: search as string, mode: 'insensitive' } },
        { user: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { user: { lastName: { contains: search as string, mode: 'insensitive' } } },
        { user: { phoneNumber: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              createdAt: true,
            },
          },
          riderApplication: {
            select: {
              id: true,
              vehicleType: true,
              vehicleModel: true,
              vehiclePlate: true,
              licenseNumber: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.driver.count({ where }),
    ]);

    res.json({
      drivers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Get driver by ID
router.get('/:id', authenticate, requirePermission('SNAP_RIDE_DRIVER_MANAGEMENT', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const [driver, totalStats, monthlyStats] = await Promise.all([
      prisma.driver.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              createdAt: true,
            },
          },
          riderApplication: {
            select: {
              id: true,
              vehicleType: true,
              vehicleModel: true,
              vehiclePlate: true,
              licenseNumber: true,
              licenseExpiry: true,
              insuranceNumber: true,
              insuranceExpiry: true,
              status: true,
              documents: {
                select: {
                  id: true,
                  documentType: true,
                  fileName: true,
                  fileUrl: true,
                },
              },
            },
          },
          rides: {
            select: {
              id: true,
              rideId: true,
              status: true,
              totalFare: true,
              driverEarnings: true,
              startedAt: true,
              completedAt: true,
              customerRating: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          earnings: {
            select: {
              id: true,
              amount: true,
              type: true,
              description: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      }),
      prisma.ride.aggregate({
        where: { driverId: id },
        _count: { id: true },
        _sum: { driverEarnings: true },
        _avg: { driverRating: true },
      }),
      // Get current month's rides and earnings
      prisma.ride.aggregate({
        where: { 
          driverId: id,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999),
          }
        },
        _count: { id: true },
        _sum: { driverEarnings: true },
      }),
    ]);

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Add calculated statistics to the response
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const driverWithStats = {
      ...driver,
      calculatedStats: {
        totalRides: totalStats._count.id,
        totalEarnings: totalStats._sum.driverEarnings || 0,
        averageRating: totalStats._avg.driverRating || 0,
        currentMonth: {
          month: currentMonth,
          rides: monthlyStats._count.id,
          earnings: monthlyStats._sum.driverEarnings || 0,
        }
      }
    };

    res.json(driverWithStats);
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ error: 'Failed to fetch driver' });
  }
});

// Suspend driver
router.put('/:id/suspend', authenticate, requirePermission('SNAP_RIDE_DRIVER_MANAGEMENT', 'EDIT'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const driver = await prisma.driver.findUnique({
      where: { id },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    if (driver.status === 'SUSPENDED') {
      return res.status(400).json({ error: 'Driver is already suspended' });
    }

    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        isOnline: false,
        isActive: false,
      },
    });

    // Also suspend the rider application
    await prisma.riderApplication.update({
      where: { id: driver.riderApplicationId },
      data: {
        status: 'SUSPENDED',
        rejectionReason: reason || 'Driver suspended by admin',
        reviewedBy: req.user?.username,
        reviewedAt: new Date(),
      },
    });

    res.json(updatedDriver);
  } catch (error) {
    console.error('Error suspending driver:', error);
    res.status(500).json({ error: 'Failed to suspend driver' });
  }
});

// Activate driver
router.put('/:id/activate', authenticate, requirePermission('SNAP_RIDE_DRIVER_MANAGEMENT', 'EDIT'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const driver = await prisma.driver.findUnique({
      where: { id },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    if (driver.status !== 'SUSPENDED') {
      return res.status(400).json({ error: 'Driver is not suspended' });
    }

    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: {
        status: 'OFFLINE',
        isActive: true,
      },
    });

    // Also reactivate the rider application
    await prisma.riderApplication.update({
      where: { id: driver.riderApplicationId },
      data: {
        status: 'APPROVED',
        rejectionReason: null,
        reviewedBy: req.user?.username,
        reviewedAt: new Date(),
      },
    });

    res.json(updatedDriver);
  } catch (error) {
    console.error('Error activating driver:', error);
    res.status(500).json({ error: 'Failed to activate driver' });
  }
});

// Get driver performance analytics
router.get('/:id/performance', authenticate, requirePermission('SNAP_RIDE_DRIVER_MANAGEMENT', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const [
      totalRides,
      completedRides,
      cancelledRides,
      totalEarnings,
      averageRating,
      totalDistance,
      totalDuration,
      recentRides,
      earningsByPeriod,
    ] = await Promise.all([
      // Total rides in period
      prisma.ride.count({
        where: {
          driverId: id,
          createdAt: { gte: startDate },
        },
      }),
      // Completed rides in period
      prisma.ride.count({
        where: {
          driverId: id,
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
      }),
      // Cancelled rides in period
      prisma.ride.count({
        where: {
          driverId: id,
          status: 'CANCELLED',
          createdAt: { gte: startDate },
        },
      }),
      // Total earnings in period
      prisma.ride.aggregate({
        where: {
          driverId: id,
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: {
          driverEarnings: true,
        },
      }),
      // Average rating in period
      prisma.ride.aggregate({
        where: {
          driverId: id,
          status: 'COMPLETED',
          customerRating: { not: null },
          createdAt: { gte: startDate },
        },
        _avg: {
          customerRating: true,
        },
      }),
      // Total distance in period
      prisma.ride.aggregate({
        where: {
          driverId: id,
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: {
          distance: true,
        },
      }),
      // Total duration in period
      prisma.ride.aggregate({
        where: {
          driverId: id,
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: {
          duration: true,
        },
      }),
      // Recent rides
      prisma.ride.findMany({
        where: {
          driverId: id,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          rideId: true,
          status: true,
          totalFare: true,
          driverEarnings: true,
          customerRating: true,
          startedAt: true,
          completedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Earnings by day
      prisma.ride.groupBy({
        by: ['createdAt'],
        where: {
          driverId: id,
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: {
          driverEarnings: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);

    res.json({
      period: Number(period),
      totalRides,
      completedRides,
      cancelledRides,
      cancellationRate: totalRides > 0 ? (cancelledRides / totalRides) * 100 : 0,
      totalEarnings: totalEarnings._sum.driverEarnings || 0,
      averageRating: averageRating._avg.customerRating || 0,
      totalDistance: totalDistance._sum.distance || 0,
      totalDuration: totalDuration._sum.duration || 0,
      recentRides,
      earningsByPeriod: earningsByPeriod.map(item => ({
        date: item.createdAt,
        earnings: item._sum.driverEarnings || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching driver performance:', error);
    res.status(500).json({ error: 'Failed to fetch driver performance' });
  }
});

// Get driver statistics
router.get('/stats/overview', authenticate, requirePermission('SNAP_RIDE_DRIVER_MANAGEMENT', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const [
      totalDrivers,
      activeDrivers,
      onlineDrivers,
      suspendedDrivers,
      todayNewDrivers,
      thisWeekNewDrivers,
      thisMonthNewDrivers,
    ] = await Promise.all([
      prisma.driver.count(),
      prisma.driver.count({ where: { isActive: true } }),
      prisma.driver.count({ where: { isOnline: true } }),
      prisma.driver.count({ where: { status: 'SUSPENDED' } }),
      prisma.driver.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.driver.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
      }),
      prisma.driver.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    res.json({
      totalDrivers,
      activeDrivers,
      onlineDrivers,
      suspendedDrivers,
      todayNewDrivers,
      thisWeekNewDrivers,
      thisMonthNewDrivers,
    });
  } catch (error) {
    console.error('Error fetching driver statistics:', error);
    res.status(500).json({ error: 'Failed to fetch driver statistics' });
  }
});

// Get drivers by status
router.get('/stats/by-status', authenticate, requirePermission('SNAP_RIDE_DRIVER_MANAGEMENT', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const statusCounts = await prisma.driver.groupBy({
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

export default router; 