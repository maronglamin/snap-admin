import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';

const router = express.Router();
const prisma = new PrismaClient();

// @route   GET /api/ride-service-tiers/kpis
// @desc    Get KPI metrics for drivers across ride services
// @access  Private
router.get('/kpis', authenticate, requirePermission('SNAP_RIDE_RIDE_SERVICE_TIERS', 'VIEW'), async (req: any, res) => {
  try {
    // Get all ride services
    const rideServices = await prisma.rideService.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        vehicleType: true,
        isActive: true,
      },
      orderBy: { name: 'asc' }
    });

    // Get driver counts for each ride service
    const kpiData = await Promise.all(
      rideServices.map(async (service) => {
        const totalDrivers = await prisma.driver.count({
          where: { rideServiceId: service.id }
        });

        const onlineDrivers = await prisma.driver.count({
          where: { 
            rideServiceId: service.id,
            status: 'ONLINE'
          }
        });

        const offlineDrivers = await prisma.driver.count({
          where: { 
            rideServiceId: service.id,
            status: 'OFFLINE'
          }
        });

        const busyDrivers = await prisma.driver.count({
          where: { 
            rideServiceId: service.id,
            status: 'BUSY'
          }
        });

        return {
          serviceId: service.id,
          serviceName: service.name,
          vehicleType: service.vehicleType,
          totalDrivers,
          onlineDrivers,
          offlineDrivers,
          busyDrivers,
        };
      })
    );

    // Get overall totals
    const totalDrivers = await prisma.driver.count();
    const totalOnlineDrivers = await prisma.driver.count({ where: { status: 'ONLINE' } });
    const totalOfflineDrivers = await prisma.driver.count({ where: { status: 'OFFLINE' } });
    const totalBusyDrivers = await prisma.driver.count({ where: { status: 'BUSY' } });
    const totalAssignedDrivers = await prisma.driver.count({ where: { rideServiceId: { not: null } } });
    const totalUnassignedDrivers = await prisma.driver.count({ where: { rideServiceId: null } });

    const overallKPIs = {
      totalDrivers,
      totalOnlineDrivers,
      totalOfflineDrivers,
      totalBusyDrivers,
      totalAssignedDrivers,
      totalUnassignedDrivers,
    };

    res.json({
      success: true,
      data: {
        overallKPIs,
        serviceKPIs: kpiData
      }
    });
  } catch (error) {
    console.error('Error fetching KPI data:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/ride-service-tiers
// @desc    Get all drivers with their ride service assignments
// @access  Private
router.get('/', authenticate, requirePermission('SNAP_RIDE_RIDE_SERVICE_TIERS', 'VIEW'), async (req: any, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      rideServiceId = 'all',
      status = 'all',
      driverStatus = 'all'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    // Search filter (driver name, driver ID)
    if (search && search !== '') {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { driverId: { contains: search, mode: 'insensitive' } },
        { rideService: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Ride service filter
    if (rideServiceId && rideServiceId !== 'all') {
      where.rideServiceId = rideServiceId;
    }

    // Driver status filter (online, offline, busy)
    if (driverStatus && driverStatus !== 'all') {
      where.status = driverStatus;
    }

    // Legacy status filter (for backward compatibility)
    if (status && status !== 'all') {
      where.status = status;
    }

    // Get total count
    const total = await prisma.driver.count({ where });
    const totalPages = Math.ceil(total / limitNum);

    // Get paginated data with related information
    const drivers = await prisma.driver.findMany({
      where,
      skip,
      take: limitNum,
      select: {
        id: true,
        driverId: true,
        status: true,
        isOnline: true,
        isVerified: true,
        isActive: true,
        updatedBy: true,
        updatedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        rideService: {
          select: {
            id: true,
            name: true,
            vehicleType: true,
            isActive: true,
          }
        },
        riderApplication: {
          select: {
            id: true,
            status: true,
            vehicleType: true,
            vehicleModel: true,
            vehiclePlate: true,
          }
        },
      } as any,
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: drivers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      }
    });
  } catch (error) {
    console.error('Error fetching ride service tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/ride-service-tiers/available-ride-services
// @desc    Get available ride services for assignment
// @access  Private
router.get('/available-ride-services', authenticate, requirePermission('SNAP_RIDE_RIDE_SERVICE_TIERS', 'VIEW'), async (req: any, res) => {
  try {
    const rideServices = await prisma.rideService.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        vehicleType: true,
        description: true,
        isDefault: true,
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: rideServices
    });
  } catch (error) {
    console.error('Error fetching available ride services:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PUT /api/ride-service-tiers/:driverId/assign
// @desc    Assign a driver to a ride service
// @access  Private
router.put('/:driverId/assign', [
  authenticate,
  requirePermission('SNAP_RIDE_RIDE_SERVICE_TIERS', 'EDIT'),
  body('rideServiceId').notEmpty().withMessage('Ride service ID is required'),
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    const { driverId } = req.params;
    const { rideServiceId } = req.body;

    // Get current admin user
    const adminUser = req.user as any;
    if (!adminUser || !adminUser.username) {
      return res.status(401).json({
        success: false,
        error: 'Admin user not authenticated',
      });
    }

    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
        rideService: {
          select: {
            name: true,
          }
        },
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found',
      });
    }

    // Check if ride service exists
    const rideService = await prisma.rideService.findUnique({
      where: { id: rideServiceId }
    });

    if (!rideService) {
      return res.status(404).json({
        success: false,
        error: 'Ride service not found',
      });
    }

    // Update driver's ride service assignment
    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: { 
        rideServiceId,
        updatedBy: adminUser.username, // Track which admin made the change
      } as any,
      select: {
        id: true,
        driverId: true,
        status: true,
        isOnline: true,
        isVerified: true,
        isActive: true,
        updatedBy: true,
        updatedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        rideService: {
          select: {
            id: true,
            name: true,
            vehicleType: true,
            isActive: true,
          }
        },
        riderApplication: {
          select: {
            id: true,
            status: true,
            vehicleType: true,
            vehicleModel: true,
            vehiclePlate: true,
          }
        },
      } as any
    });

    res.json({
      success: true,
      data: updatedDriver,
      message: `Driver ${driver.user.firstName} ${driver.user.lastName} has been assigned to ${rideService.name}`,
    });
  } catch (error) {
    console.error('Error assigning driver to ride service:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PUT /api/ride-service-tiers/:driverId/unassign
// @desc    Unassign a driver from their current ride service
// @access  Private
router.put('/:driverId/unassign', [
  authenticate,
  requirePermission('SNAP_RIDE_RIDE_SERVICE_TIERS', 'EDIT'),
], async (req: any, res) => {
  try {
    const { driverId } = req.params;

    // Get current admin user
    const adminUser = req.user as any;
    if (!adminUser || !adminUser.username) {
      return res.status(401).json({
        success: false,
        error: 'Admin user not authenticated',
      });
    }

    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
        rideService: {
          select: {
            name: true,
          }
        },
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found',
      });
    }

    if (!driver.rideServiceId) {
      return res.status(400).json({
        success: false,
        error: 'Driver is not assigned to any ride service',
      });
    }

    // Unassign driver from ride service
    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: { 
        rideServiceId: null,
        updatedBy: adminUser.username, // Track which admin made the change
      } as any,
      select: {
        id: true,
        driverId: true,
        status: true,
        isOnline: true,
        isVerified: true,
        isActive: true,
        updatedBy: true,
        updatedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        rideService: {
          select: {
            id: true,
            name: true,
            vehicleType: true,
            isActive: true,
          }
        },
        riderApplication: {
          select: {
            id: true,
            status: true,
            vehicleType: true,
            vehicleModel: true,
            vehiclePlate: true,
          }
        },
      } as any
    });

    res.json({
      success: true,
      data: updatedDriver,
      message: `Driver ${driver.user.firstName} ${driver.user.lastName} has been unassigned from ${driver.rideService?.name}`,
    });
  } catch (error) {
    console.error('Error unassigning driver from ride service:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/ride-service-tiers/:driverId/performance
// @desc    Get driver performance metrics with date filtering
// @access  Private
router.get('/:driverId/performance', [
  authenticate,
  requirePermission('SNAP_RIDE_RIDE_SERVICE_TIERS', 'VIEW'),
], async (req: any, res) => {
  try {
    const { driverId } = req.params;
    const { dateFilter = 'all' } = req.query;

    // Check if driver exists and get their user ID
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
          }
        },
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found',
      });
    }

    // Calculate date range based on filter
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default: // 'all'
        startDate = undefined;
        endDate = undefined;
    }

    // Build date filter for queries
    const dateFilterCondition = startDate && endDate ? {
      createdAt: {
        gte: startDate,
        lte: endDate,
      }
    } : {};

    // Build date filter for ride completion
    const rideCompletionFilter = startDate && endDate ? {
      completedAt: {
        gte: startDate,
        lte: endDate,
      }
    } : {};

    // Get rides data - using driver.id (not userId)
    const rides = await prisma.ride.findMany({
      where: {
        driverId: driver.id, // This is the correct relationship
        status: {
          in: ['COMPLETED'] // Only count completed rides
        },
        ...rideCompletionFilter, // Use completion date for rides
      },
      select: {
        id: true,
        totalFare: true,
        driverEarnings: true,
        customerRating: true, // Use customerRating instead of driverRating
        status: true,
        completedAt: true,
      }
    });

    // Get settlements data - using driver.userId (same as user.id)
    // Filter for ride-related settlements
    const settlements = await prisma.settlement.findMany({
      where: {
        userId: driver.userId, // This is the correct relationship
        channel: 'RIDES', // Only ride service settlements
        ...dateFilterCondition,
      },
      select: {
        id: true,
        status: true,
        amount: true,
        type: true,
        channel: true,
      }
    });

    // Calculate metrics
    const totalRides = rides.length;
    const totalEarnings = rides.reduce((sum, ride) => sum + Number(ride.driverEarnings), 0);
    
    // Calculate average rating
    const ratedRides = rides.filter(ride => ride.customerRating !== null);
    const averageRating = ratedRides.length > 0 
      ? ratedRides.reduce((sum, ride) => sum + (ride.customerRating || 0), 0) / ratedRides.length 
      : 0;

    // Calculate settlement KPIs
    const settlementKPIs = {
      paid: settlements.filter(s => s.status === 'COMPLETED').length,
      pending: settlements.filter(s => s.status === 'PENDING').length,
      processing: settlements.filter(s => s.status === 'PROCESSING').length,
    };

    const performanceMetrics = {
      totalRides,
      totalEarnings,
      rating: averageRating,
      ratingCount: ratedRides.length,
      settlements: settlementKPIs,
    };

    // Add debugging information
    console.log(`Performance metrics for driver ${driverId}:`, {
      dateFilter,
      ridesFound: rides.length,
      settlementsFound: settlements.length,
      totalRides,
      totalEarnings,
      averageRating,
      settlementKPIs,
    });

    res.json({
      success: true,
      data: performanceMetrics,
      message: "Settlement records are for ride service only",
    });
  } catch (error) {
    console.error('Error getting driver performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PUT /api/ride-service-tiers/:driverId/status
// @desc    Update driver status (set to offline)
// @access  Private
router.put('/:driverId/status', [
  authenticate,
  requirePermission('SNAP_RIDE_RIDE_SERVICE_TIERS', 'EDIT'),
], async (req: any, res) => {
  try {
    const { driverId } = req.params;
    const { status } = req.body;

    // Get current admin user
    const adminUser = req.user as any;
    if (!adminUser || !adminUser.username) {
      return res.status(401).json({
        success: false,
        error: 'Admin user not authenticated',
      });
    }

    // Validate status
    if (!status || !['ONLINE', 'OFFLINE', 'BUSY'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required (ONLINE, OFFLINE, BUSY)',
      });
    }

    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found',
      });
    }

    // Update driver status
    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: { 
        status: status as any,
        isOnline: status === 'ONLINE', // Set isOnline based on status
        updatedBy: adminUser.username, // Track which admin made the change
      } as any,
      select: {
        id: true,
        driverId: true,
        status: true,
        isOnline: true,
        isVerified: true,
        isActive: true,
        updatedBy: true,
        updatedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        rideService: {
          select: {
            id: true,
            name: true,
            vehicleType: true,
            isActive: true,
          }
        },
        riderApplication: {
          select: {
            id: true,
            status: true,
            vehicleType: true,
            vehicleModel: true,
            vehiclePlate: true,
          }
        },
      } as any
    });

    res.json({
      success: true,
      data: updatedDriver,
      message: `Driver ${driver.user.firstName} ${driver.user.lastName} status updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
