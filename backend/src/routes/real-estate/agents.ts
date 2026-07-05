import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, requirePermission('SNAP_REAL_ESTATE_AGENTS', 'VIEW'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (isActive !== undefined && isActive !== '') where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { displayName: { contains: String(search), mode: 'insensitive' } },
        { companyName: { contains: String(search), mode: 'insensitive' } },
        { user: { phoneNumber: { contains: String(search), mode: 'insensitive' } } },
      ];
    }
    const [agents, total] = await Promise.all([
      prisma.propertyAgent.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
          _count: { select: { listings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.propertyAgent.count({ where }),
    ]);
    res.json({
      agents,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('Error fetching property agents:', error);
    res.status(500).json({ error: 'Failed to fetch property agents' });
  }
});

router.patch('/:id/toggle-active', authenticate, requirePermission('SNAP_REAL_ESTATE_AGENTS', 'EDIT'), async (req, res) => {
  try {
    const agent = await prisma.propertyAgent.findUnique({ where: { id: req.params.id } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const updated = await prisma.propertyAgent.update({
      where: { id: agent.id },
      data: { isActive: !agent.isActive },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error toggling agent status:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

export default router;
