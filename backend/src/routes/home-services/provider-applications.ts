import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import { AuthenticatedRequest } from '../../types';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/stats', authenticate, requirePermission('SNAP_HOME_SERVICES_PROVIDER_APPLICATIONS', 'VIEW'), async (_req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [pending, approved, rejected, today] = await Promise.all([
      prisma.serviceProviderApplication.count({ where: { status: 'PENDING' } }),
      prisma.serviceProviderApplication.count({ where: { status: 'APPROVED' } }),
      prisma.serviceProviderApplication.count({ where: { status: 'REJECTED' } }),
      prisma.serviceProviderApplication.count({ where: { createdAt: { gte: todayStart } } }),
    ]);
    res.json({ stats: { pending, approved, rejected, today, total: pending + approved + rejected } });
  } catch (error) {
    console.error('Error fetching provider application stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/', authenticate, requirePermission('SNAP_HOME_SERVICES_PROVIDER_APPLICATIONS', 'VIEW'), async (req, res) => {
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
        { email: { contains: String(search), mode: 'insensitive' } },
        { city: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const [applications, total] = await Promise.all([
      prisma.serviceProviderApplication.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
          provider: { select: { id: true, isActive: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.serviceProviderApplication.count({ where }),
    ]);
    res.json({
      applications,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('Error fetching provider applications:', error);
    res.status(500).json({ error: 'Failed to fetch provider applications' });
  }
});

router.get('/:id', authenticate, requirePermission('SNAP_HOME_SERVICES_PROVIDER_APPLICATIONS', 'VIEW'), async (req, res) => {
  try {
    const application = await prisma.serviceProviderApplication.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phoneNumber: true, createdAt: true } },
        provider: true,
      },
    });
    if (!application) return res.status(404).json({ error: 'Application not found' });

    const categoryIds = (application.categoryIds as string[]) || [];
    const categories = categoryIds.length
      ? await prisma.serviceCategory.findMany({ where: { id: { in: categoryIds } } })
      : [];

    res.json({ ...application, categories });
  } catch (error) {
    console.error('Error fetching provider application:', error);
    res.status(500).json({ error: 'Failed to fetch provider application' });
  }
});

router.patch('/:id/approve', authenticate, requirePermission('SNAP_HOME_SERVICES_PROVIDER_APPLICATIONS', 'EDIT'), async (req: AuthenticatedRequest, res) => {
  try {
    const application = await prisma.serviceProviderApplication.findUnique({ where: { id: req.params.id } });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending applications can be approved' });
    }

    const existingProvider = await prisma.serviceProvider.findUnique({ where: { userId: application.userId } });
    if (existingProvider) {
      return res.status(400).json({ error: 'User is already an approved service provider' });
    }

    const provider = await prisma.$transaction(async (tx) => {
      await tx.serviceProviderApplication.update({
        where: { id: application.id },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      });
      const created = await tx.serviceProvider.create({
        data: {
          userId: application.userId,
          applicationId: application.id,
          displayName: `${application.firstName} ${application.lastName}`,
          bio: application.bio,
          address: application.address,
          city: application.city,
          latitude: application.latitude,
          longitude: application.longitude,
        },
      });
      const categoryIds = (application.categoryIds as string[]) || [];
      for (const categoryId of categoryIds) {
        await tx.serviceProviderCategory.create({ data: { providerId: created.id, categoryId } }).catch(() => {});
      }
      return created;
    });

    res.json({ application: { ...application, status: 'APPROVED' }, provider });
  } catch (error) {
    console.error('Error approving provider application:', error);
    res.status(500).json({ error: 'Failed to approve provider application' });
  }
});

router.patch('/:id/reject', authenticate, requirePermission('SNAP_HOME_SERVICES_PROVIDER_APPLICATIONS', 'EDIT'), async (req: AuthenticatedRequest, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason?.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    const application = await prisma.serviceProviderApplication.findUnique({ where: { id: req.params.id } });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending applications can be rejected' });
    }
    const updated = await prisma.serviceProviderApplication.update({
      where: { id: application.id },
      data: { status: 'REJECTED', rejectionReason: rejectionReason.trim(), reviewedAt: new Date() },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error rejecting provider application:', error);
    res.status(500).json({ error: 'Failed to reject provider application' });
  }
});

export default router;
