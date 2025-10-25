import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// @route   GET /api/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/', authenticate, async (req: any, res) => {
  try {
    const now = new Date();
    
    // Current 30 days period
    const current30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const current30DaysEnd = now;
    
    // Previous 60 days period (60 days before current 30 days)
    const previous60DaysStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const previous60DaysEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Helper function to calculate growth percentage
    const calculateGrowth = (current: number, previous: number): string => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const growth = ((current - previous) / previous) * 100;
      return growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
    };

    // 1. Customer Base - Total users that do not exist in sellerKyc and drivers db table
    const customerBase = await prisma.user.count({
      where: {
        AND: [
          { sellerKyc: null },
          { driver: null }
        ]
      }
    });

    // Customer Base growth calculation
    const customerBaseCurrent30Days = await prisma.user.count({
      where: {
        AND: [
          { sellerKyc: null },
          { driver: null },
          {
            createdAt: {
              gte: current30DaysStart,
              lte: current30DaysEnd,
            }
          }
        ]
      }
    });

    const customerBasePrevious60Days = await prisma.user.count({
      where: {
        AND: [
          { sellerKyc: null },
          { driver: null },
          {
            createdAt: {
              gte: previous60DaysStart,
              lte: previous60DaysEnd,
            }
          }
        ]
      }
    });

    // 2. E-commerce Sellers - Users that exist in sellerKyc table
    const ecommerceSellers = await prisma.user.count({
      where: {
        sellerKyc: {
          isNot: null
        }
      }
    });

    // E-commerce Sellers growth calculation
    const ecommerceSellersCurrent30Days = await prisma.user.count({
      where: {
        AND: [
          {
            sellerKyc: {
              isNot: null
            }
          },
          {
            createdAt: {
              gte: current30DaysStart,
              lte: current30DaysEnd,
            }
          }
        ]
      }
    });

    const ecommerceSellersPrevious60Days = await prisma.user.count({
      where: {
        AND: [
          {
            sellerKyc: {
              isNot: null
            }
          },
          {
            createdAt: {
              gte: previous60DaysStart,
              lte: previous60DaysEnd,
            }
          }
        ]
      }
    });

    // 3. Ride Drivers - Users that exist in drivers db table
    const rideDrivers = await prisma.user.count({
      where: {
        driver: {
          isNot: null
        }
      }
    });

    // Ride Drivers growth calculation
    const rideDriversCurrent30Days = await prisma.user.count({
      where: {
        AND: [
          {
            driver: {
              isNot: null
            }
          },
          {
            createdAt: {
              gte: current30DaysStart,
              lte: current30DaysEnd,
            }
          }
        ]
      }
    });

    const rideDriversPrevious60Days = await prisma.user.count({
      where: {
        AND: [
          {
            driver: {
              isNot: null
            }
          },
          {
            createdAt: {
              gte: previous60DaysStart,
              lte: previous60DaysEnd,
            }
          }
        ]
      }
    });

    // 4. Total Revenue - All service fees from externalTransaction for current month (GMD only)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const serviceFeeTransactions = await prisma.externalTransaction.findMany({
      where: {
        transactionType: 'SERVICE_FEE',
        currencyCode: 'GMD',
        status: 'SUCCESS',
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      select: {
        amount: true,
      }
    });

    const totalRevenue = serviceFeeTransactions.reduce((sum, transaction) => {
      return sum + Number(transaction.amount);
    }, 0);

    // Revenue growth calculation (current 30 days vs previous 60 days)
    const revenueCurrent30Days = await prisma.externalTransaction.aggregate({
      where: {
        transactionType: 'SERVICE_FEE',
        currencyCode: 'GMD',
        status: 'SUCCESS',
        createdAt: {
          gte: current30DaysStart,
          lte: current30DaysEnd,
        },
      },
      _sum: {
        amount: true,
      }
    });

    const revenuePrevious60Days = await prisma.externalTransaction.aggregate({
      where: {
        transactionType: 'SERVICE_FEE',
        currencyCode: 'GMD',
        status: 'SUCCESS',
        createdAt: {
          gte: previous60DaysStart,
          lte: previous60DaysEnd,
        },
      },
      _sum: {
        amount: true,
      }
    });

    const currentRevenue = Number(revenueCurrent30Days._sum.amount || 0);
    const previousRevenue = Number(revenuePrevious60Days._sum.amount || 0);

    // Get recent activities from multiple sources
    const recentActivities = [];

    // 1. Latest customer registrations (users not in sellerKyc or driver)
    const recentCustomers = await prisma.user.findMany({
      where: {
        AND: [
          { sellerKyc: null },
          { driver: null }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    recentCustomers.forEach(customer => {
      recentActivities.push({
        id: customer.id,
        type: 'CUSTOMER_REGISTRATION',
        title: 'New Customer Registration',
        description: `${customer.firstName} ${customer.lastName} (${customer.phoneNumber})`,
        timestamp: customer.createdAt,
        icon: '👤'
      });
    });

    // 2. Latest seller registrations (users with sellerKyc)
    const recentSellers = await prisma.user.findMany({
      where: {
        sellerKyc: {
          isNot: null
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        sellerKyc: {
          select: {
            businessName: true,
            createdAt: true
          }
        }
      },
      orderBy: { 
        sellerKyc: {
          createdAt: 'desc'
        }
      },
      take: 2
    });

    recentSellers.forEach(seller => {
      recentActivities.push({
        id: seller.id,
        type: 'SELLER_REGISTRATION',
        title: 'New Seller Registration',
        description: `${seller.firstName} ${seller.lastName} (${seller.phoneNumber}) - ${seller.sellerKyc?.businessName || 'Business'}`,
        timestamp: seller.sellerKyc?.createdAt || new Date(),
        icon: '🏪'
      });
    });

    // 3. Latest driver registrations (users with driver records)
    const recentDrivers = await prisma.user.findMany({
      where: {
        driver: {
          isNot: null
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        driver: {
          select: {
            createdAt: true
          }
        }
      },
      orderBy: {
        driver: {
          createdAt: 'desc'
        }
      },
      take: 2
    });

    recentDrivers.forEach(driver => {
      recentActivities.push({
        id: driver.id,
        type: 'DRIVER_REGISTRATION',
        title: 'New Driver Registration',
        description: `${driver.firstName} ${driver.lastName} (${driver.phoneNumber})`,
        timestamp: driver.driver?.createdAt || new Date(),
        icon: '🚗'
      });
    });

    // 4. Latest settlement requests
    const recentSettlements = await prisma.settlement.findMany({
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
        userId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 2
    });

    // Get user details for settlements
    const settlementUsers = await prisma.user.findMany({
      where: {
        id: {
          in: recentSettlements.map(s => s.userId)
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      }
    });

    const userMap = new Map(settlementUsers.map(user => [user.id, user]));

    recentSettlements.forEach(settlement => {
      const user = userMap.get(settlement.userId);
      recentActivities.push({
        id: settlement.id,
        type: 'SETTLEMENT_REQUEST',
        title: 'Settlement Request',
        description: `${user?.firstName || 'User'} ${user?.lastName || ''} (${user?.phoneNumber || 'N/A'}) - ${settlement.currency} ${settlement.amount}`,
        timestamp: settlement.createdAt,
        icon: '💰'
      });
    });

    // 5. Latest orders
    const recentOrders = await prisma.orders.findMany({
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        currencyCode: true,
        status: true,
        createdAt: true,
        userId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 2
    });

    // Get user details for orders
    const orderUsers = await prisma.user.findMany({
      where: {
        id: {
          in: recentOrders.map(o => o.userId)
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      }
    });

    const orderUserMap = new Map(orderUsers.map(user => [user.id, user]));

    recentOrders.forEach(order => {
      const user = orderUserMap.get(order.userId);
      recentActivities.push({
        id: order.id,
        type: 'ORDER',
        title: 'New Order',
        description: `${user?.firstName || 'Customer'} ${user?.lastName || ''} (${user?.phoneNumber || 'N/A'}) - Order #${order.orderNumber} - ${order.currencyCode} ${order.totalAmount}`,
        timestamp: order.createdAt,
        icon: '📦'
      });
    });

    // 6. Latest products
    const recentProducts = await prisma.product.findMany({
      select: {
        id: true,
        title: true,
        price: true,
        currencyCode: true,
        createdAt: true,
        sellerId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 2
    });

    // Get seller details for products
    const productSellers = await prisma.user.findMany({
      where: {
        id: {
          in: recentProducts.map(p => p.sellerId)
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      }
    });

    const productSellerMap = new Map(productSellers.map(user => [user.id, user]));

    recentProducts.forEach(product => {
      const seller = productSellerMap.get(product.sellerId);
      recentActivities.push({
        id: product.id,
        type: 'PRODUCT',
        title: 'New Product Uploaded',
        description: `${seller?.firstName || 'Seller'} ${seller?.lastName || ''} (${seller?.phoneNumber || 'N/A'}) - ${product.title} - ${product.currencyCode} ${product.price}`,
        timestamp: product.createdAt,
        icon: '🛍️'
      });
    });

    // 7. Latest rides
    const recentRides = await prisma.ride.findMany({
      select: {
        id: true,
        totalFare: true,
        status: true,
        createdAt: true,
        customerId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 2
    });

    // Get customer details for rides
    const rideCustomers = await prisma.user.findMany({
      where: {
        id: {
          in: recentRides.map(r => r.customerId)
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      }
    });

    const rideCustomerMap = new Map(rideCustomers.map(user => [user.id, user]));

    recentRides.forEach(ride => {
      const customer = rideCustomerMap.get(ride.customerId);
      recentActivities.push({
        id: ride.id,
        type: 'RIDE',
        title: 'New Ride',
        description: `${customer?.firstName || 'Customer'} ${customer?.lastName || ''} (${customer?.phoneNumber || 'N/A'}) - GMD ${ride.totalFare}`,
        timestamp: ride.createdAt,
        icon: '🚕'
      });
    });

    // Sort all activities by timestamp and take the latest 10
    const sortedActivities = recentActivities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    // Generate revenue trend data for the last 30 days
    const revenueTrendData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      // Get service fees for rides for this specific day
      const ridesServiceFee = await prisma.externalTransaction.aggregate({
        where: {
          transactionType: 'SERVICE_FEE',
          appService: 'RIDES',
          currencyCode: 'GMD',
          status: 'SUCCESS',
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        _sum: {
          amount: true,
        }
      });

      // Get service fees for e-commerce for this specific day
      const ecommerceServiceFee = await prisma.externalTransaction.aggregate({
        where: {
          transactionType: 'SERVICE_FEE',
          appService: 'ECOMMERCE',
          currencyCode: 'GMD',
          status: 'SUCCESS',
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        _sum: {
          amount: true,
        }
      });

      revenueTrendData.push({
        date: dayStart.toISOString().split('T')[0], // YYYY-MM-DD format
        rides: Number(ridesServiceFee._sum.amount || 0),
        ecommerce: Number(ecommerceServiceFee._sum.amount || 0),
      });
    }

    // Generate user growth data for the last 7 days (daily registrations)
    const userGrowthData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      // Get customers for this specific day
      const customersCount = await prisma.user.count({
        where: {
          AND: [
            { sellerKyc: null },
            { driver: null },
            {
              createdAt: {
                gte: dayStart,
                lte: dayEnd,
              }
            }
          ]
        }
      });

      // Get sellers for this specific day
      const sellersCount = await prisma.user.count({
        where: {
          AND: [
            {
              sellerKyc: {
                isNot: null
              }
            },
            {
              createdAt: {
                gte: dayStart,
                lte: dayEnd,
              }
            }
          ]
        }
      });

      // Get drivers for this specific day
      const driversCount = await prisma.user.count({
        where: {
          AND: [
            {
              driver: {
                isNot: null
              }
            },
            {
              createdAt: {
                gte: dayStart,
                lte: dayEnd,
              }
            }
          ]
        }
      });

      userGrowthData.push({
        date: dayStart.toISOString().split('T')[0], // YYYY-MM-DD format
        customers: customersCount,
        sellers: sellersCount,
        drivers: driversCount,
      });
    }

    // Generate cumulative user growth data for the last 30 days
    const userGrowthTrendData = [];
    
    // Get the start date (30 days ago)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfThirtyDaysAgo = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 0, 0, 0, 0);
    
    // Get total counts as of 30 days ago (baseline)
    const baselineCustomers = await prisma.user.count({
      where: {
        AND: [
          { sellerKyc: null },
          { driver: null },
          {
            createdAt: {
              lt: startOfThirtyDaysAgo,
            }
          }
        ]
      }
    });

    const baselineSellers = await prisma.user.count({
      where: {
        AND: [
          {
            sellerKyc: {
              isNot: null
            }
          },
          {
            createdAt: {
              lt: startOfThirtyDaysAgo,
            }
          }
        ]
      }
    });

    const baselineDrivers = await prisma.user.count({
      where: {
        AND: [
          {
            driver: {
              isNot: null
            }
          },
          {
            createdAt: {
              lt: startOfThirtyDaysAgo,
            }
          }
        ]
      }
    });

    // Generate data for each of the last 30 days
    let runningCustomers = baselineCustomers;
    let runningSellers = baselineSellers;
    let runningDrivers = baselineDrivers;

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      // Get new registrations for this specific day
      const dailyCustomers = await prisma.user.count({
        where: {
          AND: [
            { sellerKyc: null },
            { driver: null },
            {
              createdAt: {
                gte: dayStart,
                lte: dayEnd,
              }
            }
          ]
        }
      });

      const dailySellers = await prisma.user.count({
        where: {
          AND: [
            {
              sellerKyc: {
                isNot: null
              }
            },
            {
              createdAt: {
                gte: dayStart,
                lte: dayEnd,
              }
            }
          ]
        }
      });

      const dailyDrivers = await prisma.user.count({
        where: {
          AND: [
            {
              driver: {
                isNot: null
              }
            },
            {
              createdAt: {
                gte: dayStart,
                lte: dayEnd,
              }
            }
          ]
        }
      });

      // Add daily counts to running totals
      runningCustomers += dailyCustomers;
      runningSellers += dailySellers;
      runningDrivers += dailyDrivers;

      userGrowthTrendData.push({
        date: dayEnd.toISOString().split('T')[0], // YYYY-MM-DD format
        customers: runningCustomers,
        sellers: runningSellers,
        drivers: runningDrivers,
      });
    }

    res.json({
      success: true,
      data: {
        customerBase,
        ecommerceSellers,
        rideDrivers,
        totalRevenue,
        currentMonth: currentMonthName,
        currency: 'GMD',
        customerBaseGrowth: calculateGrowth(customerBaseCurrent30Days, customerBasePrevious60Days),
        ecommerceSellersGrowth: calculateGrowth(ecommerceSellersCurrent30Days, ecommerceSellersPrevious60Days),
        rideDriversGrowth: calculateGrowth(rideDriversCurrent30Days, rideDriversPrevious60Days),
        totalRevenueGrowth: calculateGrowth(currentRevenue, previousRevenue),
        revenueData: revenueTrendData,
        userGrowthData: userGrowthData,
        userGrowthTrendData: userGrowthTrendData,
        recentActivities: sortedActivities,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router; 