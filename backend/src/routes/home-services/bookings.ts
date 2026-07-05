import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, requirePermission('SNAP_HOME_SERVICES_BOOKINGS', 'VIEW'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, dateFrom, dateTo } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
      if (dateTo) where.createdAt.lte = new Date(String(dateTo));
    }
    if (search) {
      where.OR = [
        { bookingRef: { contains: String(search), mode: 'insensitive' } },
        { serviceAddress: { contains: String(search), mode: 'insensitive' } },
        { customer: { phoneNumber: { contains: String(search), mode: 'insensitive' } } },
        { provider: { displayName: { contains: String(search), mode: 'insensitive' } } },
      ];
    }
    const [bookings, total] = await Promise.all([
      prisma.serviceBooking.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
          provider: { select: { id: true, displayName: true, city: true } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.serviceBooking.count({ where }),
    ]);
    res.json({
      bookings,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('Error fetching service bookings:', error);
    res.status(500).json({ error: 'Failed to fetch service bookings' });
  }
});

router.get('/export', authenticate, requirePermission('SNAP_HOME_SERVICES_BOOKINGS', 'EXPORT'), async (req, res) => {
  try {
    const { status, dateFrom, dateTo } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
      if (dateTo) where.createdAt.lte = new Date(String(dateTo));
    }
    const bookings = await prisma.serviceBooking.findMany({
      where,
      include: {
        customer: { select: { firstName: true, lastName: true, phoneNumber: true } },
        provider: { select: { displayName: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    const header = 'Ref,Status,Payment,Customer,Phone,Provider,Category,Address,Scheduled,AgreedPrice,Currency,Created';
    const rows = bookings.map((b) =>
      [
        b.bookingRef,
        b.status,
        b.paymentStatus,
        `${b.customer.firstName} ${b.customer.lastName}`,
        b.customer.phoneNumber,
        b.provider?.displayName || '',
        b.category.name,
        `"${(b.serviceAddress || '').replace(/"/g, '""')}"`,
        b.scheduledAt?.toISOString() || '',
        b.agreedPrice?.toString() || b.proposedPrice?.toString() || '',
        b.currency,
        b.createdAt.toISOString(),
      ].join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=service-bookings.csv');
    res.send([header, ...rows].join('\n'));
  } catch (error) {
    console.error('Error exporting service bookings:', error);
    res.status(500).json({ error: 'Failed to export bookings' });
  }
});

router.get('/:id', authenticate, requirePermission('SNAP_HOME_SERVICES_BOOKINGS', 'VIEW'), async (req, res) => {
  try {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
        provider: { select: { id: true, displayName: true, city: true, user: { select: { phoneNumber: true } } } },
        category: true,
        offering: true,
        messages: {
          include: { sender: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
        },
        transactions: true,
      },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    console.error('Error fetching service booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

export default router;
