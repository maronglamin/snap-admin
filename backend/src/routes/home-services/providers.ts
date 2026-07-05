import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, requirePermission('SNAP_HOME_SERVICES_PROVIDERS', 'VIEW'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, city, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (isActive !== undefined && isActive !== '') where.isActive = isActive === 'true';
    if (city) where.city = { contains: String(city), mode: 'insensitive' };
    if (search) {
      where.OR = [
        { displayName: { contains: String(search), mode: 'insensitive' } },
        { city: { contains: String(search), mode: 'insensitive' } },
        { user: { phoneNumber: { contains: String(search), mode: 'insensitive' } } },
      ];
    }
    const [providers, total] = await Promise.all([
      prisma.serviceProvider.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
          categories: { include: { category: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.serviceProvider.count({ where }),
    ]);
    res.json({
      providers,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('Error fetching service providers:', error);
    res.status(500).json({ error: 'Failed to fetch service providers' });
  }
});

router.patch('/:id/toggle-active', authenticate, requirePermission('SNAP_HOME_SERVICES_PROVIDERS', 'EDIT'), async (req, res) => {
  try {
    const provider = await prisma.serviceProvider.findUnique({ where: { id: req.params.id } });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    const updated = await prisma.serviceProvider.update({
      where: { id: provider.id },
      data: { isActive: !provider.isActive },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error toggling provider status:', error);
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

export default router;
