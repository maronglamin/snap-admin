import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';

const router = Router();
const prisma = new PrismaClient();

// GET /api/principal-business
// Returns distinct parent sellers (principal businesses) derived from salesRep.parentSellerId
router.get('/', authenticate, requirePermission('ECOMMERCE_PRINCIPAL_BUSINESS', 'VIEW'), async (req, res) => {
  try {
    // Group by parentSellerId to get distinct principals and number of reps
    const grouped = await (prisma as any).salesRep.groupBy({
      by: ['parentSellerId'],
      _count: { parentSellerId: true },
      orderBy: { parentSellerId: 'asc' }
    });

    const parentIds: string[] = grouped.map((g: any) => g.parentSellerId).filter(Boolean);

    // Fetch user profiles for principals
    const principals = await prisma.user.findMany({
      where: { id: { in: parentIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    // Map counts and basic commerce stats (orders/products) for each principal's children
    const results = await Promise.all(principals.map(async (principal) => {
      // Get all children (sales reps) under this principal
      const children = await prisma.salesRep.findMany({
        where: { parentSellerId: principal.id },
        select: { userId: true }
      });
      const childUserIds = children.map(c => c.userId);

      // Aggregate orders and products across all children
      const [ordersAgg, productsCount] = await Promise.all([
        (prisma as any).orders.aggregate({
          where: { sellerId: { in: childUserIds } },
          _count: { _all: true },
          _sum: { totalAmount: true }
        }),
        prisma.product.count({ where: { sellerId: { in: childUserIds } } })
      ]);

      return {
        principal: {
          id: principal.id,
          name: `${principal.firstName || ''} ${principal.lastName || ''}`.trim(),
          phoneNumber: principal.phoneNumber,
          createdAt: principal.createdAt,
        },
        repsCount: grouped.find((g: any) => g.parentSellerId === principal.id)?._count?.parentSellerId || 0,
        commerce: {
          ordersCount: ordersAgg?._count?._all || 0,
          totalSales: ordersAgg?._sum?.totalAmount || 0,
          productsCount,
        }
      };
    }));

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error fetching principal businesses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch principal businesses' });
  }
});

// GET /api/principal-business/:userId/children
// Returns children sales reps for a principal that have activity in orders or products
router.get('/:userId/children', authenticate, requirePermission('ECOMMERCE_PRINCIPAL_BUSINESS', 'VIEW'), async (req, res) => {
  try {
    const { userId } = req.params;

    const reps = await prisma.salesRep.findMany({
      where: { parentSellerId: userId },
      select: { userId: true },
    });

    const childIds = reps.map(r => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: childIds } },
      select: { id: true, firstName: true, lastName: true, phoneNumber: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const results = await Promise.all(reps.map(async (rep) => {
      const [ordersCount, productsCount] = await Promise.all([
        (prisma as any).orders.count({ where: { sellerId: rep.userId } }),
        prisma.product.count({ where: { sellerId: rep.userId } })
      ]);
      const u = userMap.get(rep.userId);
      return {
        userId: rep.userId,
        name: `${u?.firstName || ''} ${u?.lastName || ''}`.trim(),
        phoneNumber: u?.phoneNumber,
        hasActivity: (ordersCount + productsCount) > 0,
        ordersCount,
        productsCount,
      };
    }));

    const filtered = results.filter(r => r.hasActivity);

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error fetching principal children with activity:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch children' });
  }
});

// GET /api/principal-business/:userId/analytics
// Consolidated analytics for a seller (child sales rep or sales rep userId) across orders and products
router.get('/:userId/analytics', authenticate, requirePermission('ECOMMERCE_PRINCIPAL_BUSINESS', 'VIEW'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const parsedStart = startDate && startDate !== 'undefined' ? new Date(startDate) : undefined;
    const parsedEnd = endDate && endDate !== 'undefined' ? new Date(endDate) : undefined;
    const hasValidRange = parsedStart instanceof Date && !isNaN(parsedStart.getTime()) && parsedEnd instanceof Date && !isNaN(parsedEnd.getTime());
    const dateRange = hasValidRange ? { gte: parsedStart!, lte: parsedEnd! } : undefined as any;

    const [ordersAgg, ordersByStatus, productsCount] = await Promise.all([
      (prisma as any).orders.aggregate({
        where: {
          sellerId: userId,
          ...(dateRange && { createdAt: dateRange })
        },
        _count: { _all: true },
        _sum: { totalAmount: true }
      }),
      (prisma as any).orders.groupBy({
        by: ['status'],
        where: {
          sellerId: userId,
          ...(dateRange && { createdAt: dateRange })
        },
        _count: { _all: true }
      }),
      prisma.product.count({
        where: {
          sellerId: userId,
          ...(dateRange && { createdAt: dateRange })
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        orders: {
          count: ordersAgg?._count?._all || 0,
          totalSales: ordersAgg?._sum?.totalAmount || 0,
          byStatus: ordersByStatus?.map((r: any) => ({ status: r.status, count: r._count?._all || 0 })) || [],
        },
        products: {
          count: productsCount,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching principal analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

export default router;


