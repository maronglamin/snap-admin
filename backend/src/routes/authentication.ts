import { Router } from 'express';
import { PrismaClient, TwilioMessageType } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';

const router = Router();
const prisma = new PrismaClient();

// @route   GET /api/authentication/device-authentication
// @desc    List Twilio notifications (device authentication SMS)
// @access  Private
router.get(
  '/device-authentication',
  authenticate,
  requirePermission('AUTHENTICATION_DEVICE_AUTHENTICATION', 'VIEW'),
  async (req: any, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        messageType = 'all',
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (search) {
        where.OR = [
          { to: { contains: search as string, mode: 'insensitive' } },
          { messageBody: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      if (messageType && messageType !== 'all') {
        where.messageType = messageType as TwilioMessageType;
      }

      // Date range filter removed per request

      const total = await prisma.twilioNotification.count({ where });
      const totalPages = Math.ceil(total / limitNum);

      const notifications = await prisma.twilioNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          device: true,
          user: true,
        },
      });

      res.json({
        success: true,
        data: notifications,
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
      console.error('Get Twilio notifications error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

// @route   GET /api/authentication/device-authentication/:id
// @desc    Get single Twilio notification by ID
// @access  Private
router.get(
  '/device-authentication/:id',
  authenticate,
  requirePermission('AUTHENTICATION_DEVICE_AUTHENTICATION', 'VIEW'),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const notification = await prisma.twilioNotification.findUnique({
        where: { id },
        include: {
          device: true,
          user: true,
        },
      });

      if (!notification) {
        return res.status(404).json({ success: false, error: 'Notification not found' });
      }

      res.json({ success: true, data: notification });
    } catch (error) {
      console.error('Get Twilio notification by ID error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

export default router;


