"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const permissions_1 = require("../middleware/permissions");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_SERVICE', 'VIEW'), async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', vehicleType, isActive, isDefault } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
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
        const total = await prisma.rideService.count({ where });
        const totalPages = Math.ceil(total / limitNum);
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
    }
    catch (error) {
        console.error('Error fetching ride services:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/vehicle-types', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_SERVICE', 'VIEW'), async (req, res) => {
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
    }
    catch (error) {
        console.error('Error fetching vehicle types:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/:id', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_SERVICE', 'VIEW'), async (req, res) => {
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
    }
    catch (error) {
        console.error('Error fetching ride service:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_SERVICE', 'ADD'), async (req, res) => {
    try {
        const { name, description, vehicleType, isActive, isDefault, isRentalType, distanceUnit, baseDistance, maxDistance, baseFare, perKmRate, perMinuteRate, minimumFare, maximumFare, currency, currencySymbol, surgeMultiplier, maxSurgeMultiplier, platformFeePercentage, driverEarningsPercentage, nightFareMultiplier, weekendFareMultiplier, cancellationFee, cancellationTimeLimit, features, restrictions, estimatedPickupTime, maxWaitTime } = req.body;
        const serviceId = `RS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
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
    }
    catch (error) {
        console.error('Error creating ride service:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.put('/:id', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_SERVICE', 'EDIT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, vehicleType, isActive, isDefault, isRentalType, distanceUnit, baseDistance, maxDistance, baseFare, perKmRate, perMinuteRate, minimumFare, maximumFare, currency, currencySymbol, surgeMultiplier, maxSurgeMultiplier, platformFeePercentage, driverEarningsPercentage, nightFareMultiplier, weekendFareMultiplier, cancellationFee, cancellationTimeLimit, features, restrictions, estimatedPickupTime, maxWaitTime } = req.body;
        const existingService = await prisma.rideService.findUnique({
            where: { id }
        });
        if (!existingService) {
            return res.status(404).json({
                success: false,
                error: 'Ride service not found'
            });
        }
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
    }
    catch (error) {
        console.error('Error updating ride service:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.delete('/:id', auth_1.authenticate, (0, permissions_1.requirePermission)('SNAP_RIDE_RIDE_SERVICE', 'DELETE'), async (req, res) => {
    try {
        const { id } = req.params;
        const existingService = await prisma.rideService.findUnique({
            where: { id }
        });
        if (!existingService) {
            return res.status(404).json({
                success: false,
                error: 'Ride service not found'
            });
        }
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
    }
    catch (error) {
        console.error('Error deleting ride service:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=ride-services.js.map