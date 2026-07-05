import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';

const router = express.Router();
const prisma = new PrismaClient();

const STAY_TYPES = ['HOTEL', 'APARTMENT_RENTAL'];

async function publishStayListing(listingId: string): Promise<{ ok: boolean; message?: string; listing?: any }> {
  const listing = await prisma.propertyListing.findUnique({
    where: { id: listingId },
    include: { roomTypesRel: { where: { isActive: true } } },
  });
  if (!listing) return { ok: false, message: 'Listing not found' };
  if (!STAY_TYPES.includes(listing.listingType)) {
    return { ok: false, message: 'Only stay listings require room setup before publishing' };
  }
  if (listing.roomTypesRel.length === 0) {
    return { ok: false, message: 'Add at least one room type before publishing' };
  }
  if (listing.status === 'ACTIVE') return { ok: true, listing };
  if (!['PENDING_SETUP', 'PENDING_REVIEW'].includes(listing.status)) {
    return { ok: false, message: `Cannot publish listing with status ${listing.status}` };
  }
  const updated = await prisma.propertyListing.update({
    where: { id: listingId },
    data: { status: 'ACTIVE' },
    include: { images: true, roomTypesRel: { where: { isActive: true } }, agent: { select: { displayName: true } } },
  });
  return { ok: true, listing: updated };
}

router.get('/', authenticate, requirePermission('SNAP_REAL_ESTATE_LISTINGS', 'VIEW'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, listingType, city, agentId, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (status) where.status = status;
    if (listingType) where.listingType = listingType;
    if (city) where.city = { contains: String(city), mode: 'insensitive' };
    if (agentId) where.agentId = String(agentId);
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { address: { contains: String(search), mode: 'insensitive' } },
        { city: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const [listings, total] = await Promise.all([
      prisma.propertyListing.findMany({
        where,
        include: {
          agent: { select: { id: true, displayName: true, companyName: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          _count: { select: { roomTypesRel: true, bookings: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.propertyListing.count({ where }),
    ]);
    res.json({
      listings,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('Error fetching property listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

router.get('/:id', authenticate, requirePermission('SNAP_REAL_ESTATE_LISTINGS', 'VIEW'), async (req, res) => {
  try {
    const listing = await prisma.propertyListing.findUnique({
      where: { id: req.params.id },
      include: {
        agent: { include: { user: { select: { phoneNumber: true, firstName: true, lastName: true } } } },
        images: { orderBy: { sortOrder: 'asc' } },
        roomTypesRel: { orderBy: { sortOrder: 'asc' } },
        virtualTours: true,
      },
    });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

router.patch('/:id/status', authenticate, requirePermission('SNAP_REAL_ESTATE_LISTINGS', 'EDIT'), async (req, res) => {
  try {
    const { status, publish } = req.body;
    const listing = await prisma.propertyListing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (publish === true) {
      const result = await publishStayListing(listing.id);
      if (!result.ok) return res.status(400).json({ error: result.message });
      return res.json(result.listing);
    }

    const allowed = ['ACTIVE', 'INACTIVE', 'PENDING_REVIEW', 'SOLD', 'RENTED'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }
    const updated = await prisma.propertyListing.update({
      where: { id: listing.id },
      data: { status },
      include: { images: { take: 1 }, agent: { select: { displayName: true } } },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating listing status:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

export default router;
