import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { AuthenticatedRequest } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard statistics
router.get('/dashboard', authenticate, requirePermission('SNAP_RIDE_ANALYTICS', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    
    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    const [
      totalRides,
      totalDrivers,
      totalCustomers,
      totalRevenue,
      todayRides,
      todayRevenue,
      thisWeekRides,
      thisWeekRevenue,
      thisMonthRides,
      thisMonthRevenue,
      activeDrivers,
      onlineDrivers,
      pendingApplications,
      completedRidesToday,
      cancelledRidesToday,
    ] = await Promise.all([
      // Total rides
      prisma.ride.count(),
      
      // Total drivers
      prisma.driver.count(),
      
      // Total customers (users who have taken rides)
      prisma.ride.groupBy({
        by: ['customerId'],
        _count: { customerId: true },
      }).then(result => result.length),
      
      // Total revenue
      prisma.ride.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalFare: true },
      }),
      
      // Today's rides
      prisma.ride.count({
        where: { createdAt: { gte: today } },
      }),
      
      // Today's revenue
      prisma.ride.aggregate({
        where: { 
          status: 'COMPLETED',
          createdAt: { gte: today } 
        },
        _sum: { totalFare: true },
      }),
      
      // This week's rides
      prisma.ride.count({
        where: { createdAt: { gte: thisWeek } },
      }),
      
      // This week's revenue
      prisma.ride.aggregate({
        where: { 
          status: 'COMPLETED',
          createdAt: { gte: thisWeek } 
        },
        _sum: { totalFare: true },
      }),
      
      // This month's rides
      prisma.ride.count({
        where: { createdAt: { gte: thisMonth } },
      }),
      
      // This month's revenue
      prisma.ride.aggregate({
        where: { 
          status: 'COMPLETED',
          createdAt: { gte: thisMonth } 
        },
        _sum: { totalFare: true },
      }),
      
      // Active drivers
      prisma.driver.count({ where: { isActive: true } }),
      
      // Online drivers
      prisma.driver.count({ where: { isOnline: true } }),
      
      // Pending applications
      prisma.riderApplication.count({ where: { status: 'PENDING' } }),
      
      // Completed rides today
      prisma.ride.count({
        where: { 
          status: 'COMPLETED',
          createdAt: { gte: today } 
        },
      }),
      
      // Cancelled rides today
      prisma.ride.count({
        where: { 
          status: 'CANCELLED',
          createdAt: { gte: today } 
        },
      }),
    ]);

    res.json({
      overview: {
        totalRides,
        totalDrivers,
        totalCustomers,
        totalRevenue: totalRevenue._sum.totalFare || 0,
        activeDrivers,
        onlineDrivers,
        pendingApplications,
      },
      today: {
        rides: todayRides,
        revenue: todayRevenue._sum.totalFare || 0,
        completedRides: completedRidesToday,
        cancelledRides: cancelledRidesToday,
        completionRate: todayRides > 0 ? (completedRidesToday / todayRides) * 100 : 0,
      },
      thisWeek: {
        rides: thisWeekRides,
        revenue: thisWeekRevenue._sum.totalFare || 0,
      },
      thisMonth: {
        rides: thisMonthRides,
        revenue: thisMonthRevenue._sum.totalFare || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get revenue analytics
router.get('/revenue', authenticate, requirePermission('SNAP_RIDE_ANALYTICS', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const [
      totalRevenue,
      driverEarnings,
      platformFees,
      revenueByDay,
      revenueByRideType,
      revenueByPaymentMethod,
      averageFare,
      averageDriverEarnings,
      topDrivers,
    ] = await Promise.all([
      // Total revenue
      prisma.ride.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: { totalFare: true },
      }),
      
      // Total driver earnings
      prisma.ride.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: { driverEarnings: true },
      }),
      
      // Total platform fees
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
        orderBy: { createdAt: 'asc' },
      }),
      
      // Revenue by ride type
      prisma.ride.groupBy({
        by: ['rideType'],
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: { totalFare: true },
        _count: { rideType: true },
      }),
      
      // Revenue by payment method
      prisma.ride.groupBy({
        by: ['paymentMethod'],
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: { totalFare: true },
        _count: { paymentMethod: true },
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
      
      // Top drivers by earnings
      prisma.ride.groupBy({
        by: ['driverId'],
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: { driverEarnings: true },
        _count: { driverId: true },
        orderBy: { _sum: { driverEarnings: 'desc' } },
        take: 10,
      }),
    ]);

    // Get driver details for top drivers
    const topDriversWithDetails = await Promise.all(
      topDrivers.map(async (driver) => {
        const driverDetails = await prisma.driver.findUnique({
          where: { id: driver.driverId },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
        });
        
        return {
          driverId: driver.driverId,
          driverName: driverDetails ? `${driverDetails.user.firstName} ${driverDetails.user.lastName}` : 'Unknown',
          phoneNumber: driverDetails?.user.phoneNumber,
          totalEarnings: driver._sum.driverEarnings || 0,
          totalRides: driver._count.driverId,
        };
      })
    );

    res.json({
      period: Number(period),
      summary: {
        totalRevenue: totalRevenue._sum.totalFare || 0,
        driverEarnings: driverEarnings._sum.driverEarnings || 0,
        platformFees: platformFees._sum.platformFee || 0,
        averageFare: averageFare._avg.totalFare || 0,
        averageDriverEarnings: averageDriverEarnings._avg.driverEarnings || 0,
      },
      revenueByDay: revenueByDay.map(item => ({
        date: item.createdAt,
        totalFare: item._sum.totalFare || 0,
        driverEarnings: item._sum.driverEarnings || 0,
        platformFee: item._sum.platformFee || 0,
      })),
      revenueByRideType: revenueByRideType.map(item => ({
        rideType: item.rideType,
        revenue: item._sum.totalFare || 0,
        count: item._count.rideType,
      })),
      revenueByPaymentMethod: revenueByPaymentMethod.map(item => ({
        paymentMethod: item.paymentMethod,
        revenue: item._sum.totalFare || 0,
        count: item._count.paymentMethod,
      })),
      topDrivers: topDriversWithDetails,
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

// Get performance metrics
router.get('/performance', authenticate, requirePermission('SNAP_RIDE_ANALYTICS', 'VIEW'), async (req: AuthenticatedRequest, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const [
      totalRides,
      completedRides,
      cancelledRides,
      averageRating,
      averageResponseTime,
      averageRideDuration,
      averageDistance,
      ridesByStatus,
      ridesByType,
      performanceByDriver,
    ] = await Promise.all([
      // Total rides
      prisma.ride.count({
        where: { createdAt: { gte: startDate } },
      }),
      
      // Completed rides
      prisma.ride.count({
        where: { 
          status: 'COMPLETED',
          createdAt: { gte: startDate } 
        },
      }),
      
      // Cancelled rides
      prisma.ride.count({
        where: { 
          status: 'CANCELLED',
          createdAt: { gte: startDate } 
        },
      }),
      
      // Average customer rating
      prisma.ride.aggregate({
        where: {
          status: 'COMPLETED',
          customerRating: { not: null },
          createdAt: { gte: startDate },
        },
        _avg: { customerRating: true },
      }),
      
      // Average response time (time from request to acceptance)
      prisma.ride.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _avg: {
          // This would need to be calculated based on rideRequest.acceptedAt - rideRequest.requestedAt
          // For now, we'll use a placeholder
        },
      }),
      
      // Average ride duration
      prisma.ride.aggregate({
        where: {
          status: 'COMPLETED',
          duration: { not: null },
          createdAt: { gte: startDate },
        },
        _avg: { duration: true },
      }),
      
      // Average distance
      prisma.ride.aggregate({
        where: {
          status: 'COMPLETED',
          distance: { not: null },
          createdAt: { gte: startDate },
        },
        _avg: { distance: true },
      }),
      
      // Rides by status
      prisma.ride.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: { status: true },
      }),
      
      // Rides by type
      prisma.ride.groupBy({
        by: ['rideType'],
        where: { createdAt: { gte: startDate } },
        _count: { rideType: true },
      }),
      
      // Performance by driver
      prisma.ride.groupBy({
        by: ['driverId'],
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _count: { driverId: true },
        _avg: { customerRating: true },
        _sum: { driverEarnings: true },
        orderBy: { _count: { driverId: 'desc' } },
        take: 10,
      }),
    ]);

    // Get driver details for performance metrics
    const performanceByDriverWithDetails = await Promise.all(
      performanceByDriver.map(async (driver) => {
        const driverDetails = await prisma.driver.findUnique({
          where: { id: driver.driverId },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
        });
        
        return {
          driverId: driver.driverId,
          driverName: driverDetails ? `${driverDetails.user.firstName} ${driverDetails.user.lastName}` : 'Unknown',
          phoneNumber: driverDetails?.user.phoneNumber,
          totalRides: driver._count.driverId,
          averageRating: driver._avg.customerRating || 0,
          totalEarnings: driver._sum.driverEarnings || 0,
        };
      })
    );

    res.json({
      period: Number(period),
      summary: {
        totalRides,
        completedRides,
        cancelledRides,
        completionRate: totalRides > 0 ? (completedRides / totalRides) * 100 : 0,
        cancellationRate: totalRides > 0 ? (cancelledRides / totalRides) * 100 : 0,
        averageRating: averageRating._avg.customerRating || 0,
        averageRideDuration: averageRideDuration._avg.duration || 0,
        averageDistance: averageDistance._avg.distance || 0,
      },
      ridesByStatus: ridesByStatus.map(item => ({
        status: item.status,
        count: item._count.status,
        percentage: totalRides > 0 ? (item._count.status / totalRides) * 100 : 0,
      })),
      ridesByType: ridesByType.map(item => ({
        rideType: item.rideType,
        count: item._count.rideType,
        percentage: totalRides > 0 ? (item._count.rideType / totalRides) * 100 : 0,
      })),
      performanceByDriver: performanceByDriverWithDetails,
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

export default router; 