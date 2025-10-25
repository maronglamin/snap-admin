import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';

const router = Router();
const prisma = new PrismaClient();

// Get all branches with summary data
router.get('/', authenticate, requirePermission('ECOMMERCE_SALES_OUTLETS', 'VIEW'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 15, 
      timeFilter = 'all',
      startDate,
      endDate 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build date filter based on timeFilter parameter
    let dateFilter: any = {};
    
    if (timeFilter !== 'all') {
      const now = new Date();
      let start: Date;
      
      switch (timeFilter) {
        case 'week':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          start = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          break;
        case 'custom':
          if (startDate && endDate) {
            start = new Date(startDate as string);
            const end = new Date(endDate as string);
            dateFilter = {
              createdAt: {
                gte: start,
                lte: end,
              },
            };
          }
          break;
        default:
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      
      if (timeFilter !== 'custom') {
        dateFilter = {
          createdAt: {
            gte: start,
          },
        };
      }
    }

    const branches = await prisma.branch.findMany({
      where: dateFilter,
      include: {
        parentSeller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        salesReps: {
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            salesReps: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limitNum,
    });

    // Get total count for pagination
    const totalCount = await prisma.branch.count({
      where: dateFilter,
    });

    // Get additional counts for products and orders from sales reps
    const branchesWithCounts = [];
    
    for (const branch of branches) {
      // Get all user IDs from sales reps in this branch
      const salesRepUserIds = branch.salesReps.map(rep => rep.userId);
      
      // Count products from these sales reps
      const productsCount = salesRepUserIds.length > 0 
        ? await prisma.product.count({
            where: {
              sellerId: {
                in: salesRepUserIds,
              },
            },
          })
        : 0;
      
      // Count orders from these sales reps
      const ordersCount = salesRepUserIds.length > 0
        ? await prisma.orders.count({
            where: {
              sellerId: {
                in: salesRepUserIds,
              },
            },
          })
        : 0;

      branchesWithCounts.push({
        ...branch,
        _count: {
          ...branch._count,
          products: productsCount,
          orders: ordersCount,
        },
      });
    }

    res.json({
      success: true,
      data: branchesWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNext: pageNum < Math.ceil(totalCount / limitNum),
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch branches' 
    });
  }
});

// GET /api/branches/parent-sellers
// Returns parent sellers with their branches and sales reps
router.get('/parent-sellers', authenticate, requirePermission('ECOMMERCE_SALES_OUTLETS', 'VIEW'), async (req, res) => {
  try {
    const { page = 1, limit = 15, timeFilter = 'all', startDate, endDate } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build date filter
    let dateFilter: any = {};
    if (timeFilter === 'custom' && startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    } else if (timeFilter !== 'all') {
      const now = new Date();
      switch (timeFilter) {
        case 'week':
          dateFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
          break;
        case 'month':
          dateFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
          break;
        case 'quarter':
          dateFilter = { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
          break;
        case 'year':
          dateFilter = { gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
          break;
      }
    }

    // Get distinct parent sellers from branches
    const parentSellers = await prisma.user.findMany({
      where: {
        branches: {
          some: {}
        },
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter
        })
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        createdAt: true,
        branches: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            country: true,
            phoneNumber: true,
            email: true,
            isActive: true,
            createdAt: true,
            salesReps: {
              select: {
                id: true,
                userId: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                  }
                }
              }
            },
            _count: {
              select: {
                salesReps: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    // Calculate products and orders counts for each parent seller
    const parentSellersWithCounts = await Promise.all(
      parentSellers.map(async (parentSeller) => {
        // Get all sales rep user IDs from all branches
        const allSalesRepUserIds = parentSeller.branches.flatMap(branch => 
          branch.salesReps.map(rep => rep.userId)
        );

        // Count total products and orders across all sales reps
        const totalProducts = allSalesRepUserIds.length > 0 
          ? await prisma.product.count({
              where: {
                sellerId: {
                  in: allSalesRepUserIds,
                },
              },
            })
          : 0;

        const totalOrders = allSalesRepUserIds.length > 0
          ? await prisma.orders.count({
              where: {
                sellerId: {
                  in: allSalesRepUserIds,
                },
              },
            })
          : 0;

        // Calculate counts for each branch
        const branchesWithCounts = await Promise.all(
          parentSeller.branches.map(async (branch) => {
            const branchSalesRepUserIds = branch.salesReps.map(rep => rep.userId);

            const branchProducts = branchSalesRepUserIds.length > 0 
              ? await prisma.product.count({
                  where: {
                    sellerId: {
                      in: branchSalesRepUserIds,
                    },
                  },
                })
              : 0;

            const branchOrders = branchSalesRepUserIds.length > 0
              ? await prisma.orders.count({
                  where: {
                    sellerId: {
                      in: branchSalesRepUserIds,
                    },
                  },
                })
              : 0;

            return {
              ...branch,
              _count: {
                ...branch._count,
                products: branchProducts,
                orders: branchOrders,
              }
            };
          })
        );

        return {
          ...parentSeller,
          branches: branchesWithCounts,
          _count: {
            branches: parentSeller.branches.length,
            salesReps: allSalesRepUserIds.length,
            products: totalProducts,
            orders: totalOrders,
          }
        };
      })
    );

    // Get total count for pagination
    const total = await prisma.user.count({
      where: {
        branches: {
          some: {}
        },
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter
        })
      }
    });

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: parentSellersWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching parent sellers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch parent sellers',
    });
  }
});

// GET /api/branches/parent-sellers/:id
// Get a single parent seller with their branches and sales reps
router.get('/parent-sellers/:id', authenticate, requirePermission('ECOMMERCE_SALES_OUTLETS', 'VIEW'), async (req, res) => {
  try {
    const { id } = req.params;

    const parentSeller = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        createdAt: true,
        branches: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            country: true,
            phoneNumber: true,
            email: true,
            isActive: true,
            createdAt: true,
            salesReps: {
              select: {
                id: true,
                userId: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                  }
                }
              }
            },
            _count: {
              select: {
                salesReps: true,
              }
            }
          }
        }
      }
    });

    if (!parentSeller) {
      return res.status(404).json({
        success: false,
        error: 'Parent seller not found',
      });
    }

    // Calculate products and orders counts
    const allSalesRepUserIds = parentSeller.branches.flatMap(branch => 
      branch.salesReps.map(rep => rep.userId)
    );

    // Count total products and orders across all sales reps
    const totalProducts = allSalesRepUserIds.length > 0 
      ? await prisma.product.count({
          where: {
            sellerId: {
              in: allSalesRepUserIds,
            },
          },
        })
      : 0;

    const totalOrders = allSalesRepUserIds.length > 0
      ? await prisma.orders.count({
          where: {
            sellerId: {
              in: allSalesRepUserIds,
            },
          },
        })
      : 0;

    // Calculate counts for each branch
    const branchesWithCounts = await Promise.all(
      parentSeller.branches.map(async (branch) => {
        const branchSalesRepUserIds = branch.salesReps.map(rep => rep.userId);

        const branchProducts = branchSalesRepUserIds.length > 0 
          ? await prisma.product.count({
              where: {
                sellerId: {
                  in: branchSalesRepUserIds,
                },
              },
            })
          : 0;

        const branchOrders = branchSalesRepUserIds.length > 0
          ? await prisma.orders.count({
              where: {
                sellerId: {
                  in: branchSalesRepUserIds,
                },
              },
            })
          : 0;

        return {
          ...branch,
          _count: {
            ...branch._count,
            products: branchProducts,
            orders: branchOrders,
          }
        };
      })
    );

    const parentSellerWithCounts = {
      ...parentSeller,
      branches: branchesWithCounts,
      _count: {
        branches: parentSeller.branches.length,
        salesReps: allSalesRepUserIds.length,
        products: totalProducts,
        orders: totalOrders,
      }
    };

    res.json({
      success: true,
      data: parentSellerWithCounts,
    });
  } catch (error) {
    console.error('Error fetching parent seller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch parent seller',
    });
  }
});

// Get branch by ID with detailed information
router.get('/:id', authenticate, requirePermission('ECOMMERCE_BRANCH_DETAILS', 'VIEW'), async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        parentSeller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        salesReps: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            salesReps: true,
          },
        },
      },
    });

    if (!branch) {
      return res.status(404).json({ 
        success: false,
        error: 'Branch not found' 
      });
    }

    // Get all user IDs from sales reps in this branch
    const salesRepUserIds = branch.salesReps.map(rep => rep.userId);
    
    // Count products from these sales reps
    const productsCount = salesRepUserIds.length > 0 
      ? await prisma.product.count({
          where: {
            sellerId: {
              in: salesRepUserIds,
            },
          },
        })
      : 0;
    
    // Count orders from these sales reps
    const ordersCount = salesRepUserIds.length > 0
      ? await prisma.orders.count({
          where: {
            sellerId: {
              in: salesRepUserIds,
            },
          },
        })
      : 0;

    // Add counts to each sales rep
    const salesRepsWithCounts = await Promise.all(
      branch.salesReps.map(async (salesRep) => {
        const repProductsCount = await prisma.product.count({
          where: {
            sellerId: salesRep.userId,
          },
        });
        
        const repOrdersCount = await prisma.orders.count({
          where: {
            sellerId: salesRep.userId,
          },
        });

        return {
          ...salesRep,
          _count: {
            products: repProductsCount,
            orders: repOrdersCount,
          },
        };
      })
    );

    const branchWithCounts = {
      ...branch,
      salesReps: salesRepsWithCounts,
      _count: {
        ...branch._count,
        products: productsCount,
        orders: ordersCount,
      },
    };

    res.json({
      success: true,
      data: branchWithCounts,
    });
  } catch (error) {
    console.error('Error fetching branch details:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch branch details' 
    });
  }
});

// Create new branch
router.post('/', authenticate, requirePermission('ECOMMERCE_SALES_OUTLETS', 'ADD'), async (req, res) => {
  try {
    const {
      parentSellerId,
      name,
      address,
      city,
      state,
      country,
      postalCode,
      phoneNumber,
      email,
    } = req.body;

    // Validate required fields
    if (!parentSellerId || !name) {
      return res.status(400).json({ error: 'Parent seller ID and name are required' });
    }

    // Check if parent seller exists
    const parentSeller = await prisma.user.findUnique({
      where: { id: parentSellerId },
    });

    if (!parentSeller) {
      return res.status(400).json({ error: 'Parent seller not found' });
    }

    const branch = await prisma.branch.create({
      data: {
        parentSellerId,
        name,
        address,
        city,
        state,
        country,
        postalCode,
        phoneNumber,
        email,
      },
      include: {
        parentSeller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        _count: {
          select: {
            salesReps: true,
            products: true,
            orders: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

// Update branch
router.put('/:id', authenticate, requirePermission('ECOMMERCE_SALES_OUTLETS', 'EDIT'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      city,
      state,
      country,
      postalCode,
      phoneNumber,
      email,
      isActive,
    } = req.body;

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name,
        address,
        city,
        state,
        country,
        postalCode,
        phoneNumber,
        email,
        isActive,
      },
      include: {
        parentSeller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        _count: {
          select: {
            salesReps: true,
            products: true,
            orders: true,
          },
        },
      },
    });

    res.json(branch);
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

// Delete branch
router.delete('/:id', authenticate, requirePermission('ECOMMERCE_SALES_OUTLETS', 'DELETE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if branch has sales reps
    const salesRepsCount = await prisma.salesRep.count({
      where: { branchId: id },
    });

    if (salesRepsCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete branch with existing sales representatives' 
      });
    }

    await prisma.branch.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ error: 'Failed to delete branch' });
  }
});

// Get sales reps for a specific branch
router.get('/:id/sales-reps', authenticate, requirePermission('ECOMMERCE_BRANCH_DETAILS', 'VIEW'), async (req, res) => {
  try {
    const { id } = req.params;

    const salesReps = await prisma.salesRep.findMany({
      where: { branchId: id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(salesReps);
  } catch (error) {
    console.error('Error fetching sales reps:', error);
    res.status(500).json({ error: 'Failed to fetch sales reps' });
  }
});

export default router;
