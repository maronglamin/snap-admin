import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';

const router = Router();
const prisma = new PrismaClient();

// @route   GET /api/ride-services
// @desc    Get all ride services with filtering and pagination
// @access  Private
router.get('/', authenticate, requirePermission('SNAP_RIDE_RIDE_SERVICE', 'VIEW'), async (req: any, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      vehicleType,
      isActive,
      isDefault
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (search && search !== '') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { serviceId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (vehicleType && vehicleType !== 'all' && vehicleType !== 'undefined') {
      where.vehicleType = vehicleType;
    }

    if (isActive && isActive !== 'all' && isActive !== 'undefined') {
      where.isActive = isActive === 'true';
    }

    if (isDefault && isDefault !== 'all' && isDefault !== 'undefined') {
      where.isDefault = isDefault === 'true';
    }

    // Get total count
    const total = await prisma.rideService.count({ where });
    const totalPages = Math.ceil(total / limitNum);

    // Get paginated data
    const rideServices = await prisma.rideService.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: rideServices,
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
    console.error('Error fetching ride services:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/ride-services/vehicle-types
// @desc    Get available vehicle types
// @access  Private
router.get('/vehicle-types', authenticate, requirePermission('SNAP_RIDE_RIDE_SERVICE', 'VIEW'), async (req: any, res) => {
  try {
    const vehicleTypes = [
      { value: 'DRIVER', label: 'Car' },
      { value: 'MOTORCYCLE', label: 'Motorcycle' },
      { value: 'BICYCLE', label: 'Bicycle' }
    ];

    res.json({
      success: true,
      data: vehicleTypes
    });
  } catch (error) {
    console.error('Error fetching vehicle types:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/ride-services/:id
// @desc    Get ride service by ID
// @access  Private
router.get('/:id', authenticate, requirePermission('SNAP_RIDE_RIDE_SERVICE', 'VIEW'), async (req: any, res) => {
  try {
    const { id } = req.params;

    const rideService = await prisma.rideService.findUnique({
      where: { id }
    });

    if (!rideService) {
      return res.status(404).json({
        success: false,
        error: 'Ride service not found'
      });
    }

    res.json({
      success: true,
      data: rideService
    });
  } catch (error) {
    console.error('Error fetching ride service:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   POST /api/ride-services
// @desc    Create a new ride service
// @access  Private
router.post('/', authenticate, requirePermission('SNAP_RIDE_RIDE_SERVICE', 'ADD'), async (req: any, res) => {
  try {
    const {
      name,
      description,
      vehicleType,
      isActive,
      isDefault,
      isRentalType,
      distanceUnit,
      baseDistance,
      maxDistance,
      baseFare,
      perKmRate,
      perMinuteRate,
      minimumFare,
      maximumFare,
      currency,
      currencySymbol,
      surgeMultiplier,
      maxSurgeMultiplier,
      platformFeePercentage,
      driverEarningsPercentage,
      nightFareMultiplier,
      weekendFareMultiplier,
      cancellationFee,
      cancellationTimeLimit,
      features,
      restrictions,
      estimatedPickupTime,
      maxWaitTime
    } = req.body;

    // Generate service ID
    const serviceId = `RS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // If this is set as default, unset other defaults for the same vehicle type
    if (isDefault) {
      await prisma.rideService.updateMany({
        where: {
          vehicleType,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const rideService = await prisma.rideService.create({
      data: {
        serviceId,
        name,
        description,
        vehicleType,
        isActive: isActive ?? true,
        isDefault: isDefault ?? false,
        isRentalType: isRentalType ?? false,
        distanceUnit: distanceUnit ?? 'KILOMETER',
        baseDistance: baseDistance ?? 1.0,
        maxDistance,
        baseFare,
        perKmRate,
        perMinuteRate,
        minimumFare,
        maximumFare,
        currency: currency ?? 'GMD',
        currencySymbol: currencySymbol ?? 'D',
        surgeMultiplier: surgeMultiplier ?? 1.0,
        maxSurgeMultiplier: maxSurgeMultiplier ?? 3.0,
        platformFeePercentage: platformFeePercentage ?? 0.15,
        driverEarningsPercentage: driverEarningsPercentage ?? 0.85,
        nightFareMultiplier: nightFareMultiplier ?? 1.2,
        weekendFareMultiplier: weekendFareMultiplier ?? 1.1,
        cancellationFee: cancellationFee ?? 0,
        cancellationTimeLimit: cancellationTimeLimit ?? 300,
        features,
        restrictions,
        estimatedPickupTime: estimatedPickupTime ?? 5,
        maxWaitTime: maxWaitTime ?? 10,
        createdBy: req.user.username
      }
    });

    res.status(201).json({
      success: true,
      data: rideService,
      message: 'Ride service created successfully'
    });
  } catch (error) {
    console.error('Error creating ride service:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   PUT /api/ride-services/:id
// @desc    Update a ride service
// @access  Private
router.put('/:id', authenticate, requirePermission('SNAP_RIDE_RIDE_SERVICE', 'EDIT'), async (req: any, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      vehicleType,
      isActive,
      isDefault,
      isRentalType,
      distanceUnit,
      baseDistance,
      maxDistance,
      baseFare,
      perKmRate,
      perMinuteRate,
      minimumFare,
      maximumFare,
      currency,
      currencySymbol,
      surgeMultiplier,
      maxSurgeMultiplier,
      platformFeePercentage,
      driverEarningsPercentage,
      nightFareMultiplier,
      weekendFareMultiplier,
      cancellationFee,
      cancellationTimeLimit,
      features,
      restrictions,
      estimatedPickupTime,
      maxWaitTime
    } = req.body;

    // Check if ride service exists
    const existingService = await prisma.rideService.findUnique({
      where: { id }
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        error: 'Ride service not found'
      });
    }

    // If this is set as default, unset other defaults for the same vehicle type
    if (isDefault && !existingService.isDefault) {
      await prisma.rideService.updateMany({
        where: {
          vehicleType: vehicleType || existingService.vehicleType,
          isDefault: true,
          id: { not: id }
        },
        data: {
          isDefault: false
        }
      });
    }

    const rideService = await prisma.rideService.update({
      where: { id },
      data: {
        name,
        description,
        vehicleType,
        isActive,
        isDefault,
        isRentalType,
        distanceUnit,
        baseDistance,
        maxDistance,
        baseFare,
        perKmRate,
        perMinuteRate,
        minimumFare,
        maximumFare,
        currency,
        currencySymbol,
        surgeMultiplier,
        maxSurgeMultiplier,
        platformFeePercentage,
        driverEarningsPercentage,
        nightFareMultiplier,
        weekendFareMultiplier,
        cancellationFee,
        cancellationTimeLimit,
        features,
        restrictions,
        estimatedPickupTime,
        maxWaitTime,
        updatedBy: req.user.username
      }
    });

    res.json({
      success: true,
      data: rideService,
      message: 'Ride service updated successfully'
    });
  } catch (error) {
    console.error('Error updating ride service:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   DELETE /api/ride-services/:id
// @desc    Delete a ride service
// @access  Private
router.delete('/:id', authenticate, requirePermission('SNAP_RIDE_RIDE_SERVICE', 'DELETE'), async (req: any, res) => {
  try {
    const { id } = req.params;

    // Check if ride service exists
    const existingService = await prisma.rideService.findUnique({
      where: { id }
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        error: 'Ride service not found'
      });
    }

    // Check if service is being used
    const driversUsingService = await prisma.driver.count({
      where: { rideServiceId: id }
    });

    const rideRequestsUsingService = await prisma.rideRequest.count({
      where: { rideServiceId: id }
    });

    const ridesUsingService = await prisma.ride.count({
      where: { rideServiceId: id }
    });

    if (driversUsingService > 0 || rideRequestsUsingService > 0 || ridesUsingService > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete ride service. It is being used by drivers, ride requests, or rides.'
      });
    }

    await prisma.rideService.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Ride service deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ride service:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
