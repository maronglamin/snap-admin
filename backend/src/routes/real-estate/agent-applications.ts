import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import { AuthenticatedRequest } from '../../types';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/stats', authenticate, requirePermission('SNAP_REAL_ESTATE_AGENT_APPLICATIONS', 'VIEW'), async (_req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [pending, approved, rejected, today] = await Promise.all([
      prisma.propertyAgentApplication.count({ where: { status: 'PENDING' } }),
      prisma.propertyAgentApplication.count({ where: { status: 'APPROVED' } }),
      prisma.propertyAgentApplication.count({ where: { status: 'REJECTED' } }),
      prisma.propertyAgentApplication.count({ where: { createdAt: { gte: todayStart } } }),
    ]);
    res.json({ stats: { pending, approved, rejected, today, total: pending + approved + rejected } });
  } catch (error) {
    console.error('Error fetching agent application stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/', authenticate, requirePermission('SNAP_REAL_ESTATE_AGENT_APPLICATIONS', 'VIEW'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, city, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (status) where.status = status;
    if (city) where.city = { contains: String(city), mode: 'insensitive' };
    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { phoneNumber: { contains: String(search), mode: 'insensitive' } },
        { companyName: { contains: String(search), mode: 'insensitive' } },
        { city: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const [applications, total] = await Promise.all([
      prisma.propertyAgentApplication.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
          agent: { select: { id: true, isActive: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.propertyAgentApplication.count({ where }),
    ]);
    res.json({
      applications,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('Error fetching agent applications:', error);
    res.status(500).json({ error: 'Failed to fetch agent applications' });
  }
});

router.get('/:id', authenticate, requirePermission('SNAP_REAL_ESTATE_AGENT_APPLICATIONS', 'VIEW'), async (req, res) => {
  try {
    const application = await prisma.propertyAgentApplication.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phoneNumber: true, createdAt: true } },
        agent: true,
      },
    });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json(application);
  } catch (error) {
    console.error('Error fetching agent application:', error);
    res.status(500).json({ error: 'Failed to fetch agent application' });
  }
});

router.patch('/:id/approve', authenticate, requirePermission('SNAP_REAL_ESTATE_AGENT_APPLICATIONS', 'EDIT'), async (req: AuthenticatedRequest, res) => {
  try {
    const application = await prisma.propertyAgentApplication.findUnique({ where: { id: req.params.id } });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending applications can be approved' });
    }
    const existingAgent = await prisma.propertyAgent.findUnique({ where: { userId: application.userId } });
    if (existingAgent) {
      return res.status(400).json({ error: 'User is already an approved property agent' });
    }

    const agent = await prisma.$transaction(async (tx) => {
      await tx.propertyAgentApplication.update({
        where: { id: application.id },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      });
      return tx.propertyAgent.create({
        data: {
          userId: application.userId,
          applicationId: application.id,
          displayName: `${application.firstName} ${application.lastName}`,
          companyName: application.companyName,
          bio: application.bio,
          specializationTypes: application.specializationTypes,
          latitude: application.latitude,
          longitude: application.longitude,
        },
      });
    });

    res.json({ application: { ...application, status: 'APPROVED' }, agent });
  } catch (error) {
    console.error('Error approving agent application:', error);
    res.status(500).json({ error: 'Failed to approve agent application' });
  }
});

router.patch('/:id/reject', authenticate, requirePermission('SNAP_REAL_ESTATE_AGENT_APPLICATIONS', 'EDIT'), async (req: AuthenticatedRequest, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason?.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    const application = await prisma.propertyAgentApplication.findUnique({ where: { id: req.params.id } });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending applications can be rejected' });
    }
    const updated = await prisma.propertyAgentApplication.update({
      where: { id: application.id },
      data: { status: 'REJECTED', rejectionReason: rejectionReason.trim(), reviewedAt: new Date() },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error rejecting agent application:', error);
    res.status(500).json({ error: 'Failed to reject agent application' });
  }
});

export default router;
