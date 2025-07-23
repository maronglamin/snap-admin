import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// @route   GET /api/ucp
// @desc    Get all UCP (settlement groups)
// @access  Private
router.get('/', authenticate, async (req: any, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      serviceType = 'all',
      isActive = 'all'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (serviceType !== 'all') {
      where.serviceType = serviceType;
    }

    if (isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    // Get total count
    const total = await prisma.uCP.count({ where });
    const totalPages = Math.ceil(total / limitNum);

    // Get paginated data
    const ucpGroups = await prisma.uCP.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    res.json({
      success: true,
      data: ucpGroups,
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
    console.error('Get UCP groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   POST /api/ucp
// @desc    Create new UCP (settlement group)
// @access  Private
router.post('/', authenticate, async (req: any, res) => {
  try {
    const { name, value, description, serviceType, isActive, metadata } = req.body;

    // Validate required fields
    if (!name || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name and value are required',
      });
    }

    // Validate metadata structure if provided
    if (metadata && typeof metadata === 'object') {
      const allowedFields = ['feeType', 'gateway', 'minAmount', 'maxAmount'];
      const metadataFields = Object.keys(metadata);
      const invalidFields = metadataFields.filter(field => !allowedFields.includes(field));
      
      if (invalidFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid metadata fields: ${invalidFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`,
        });
      }
    }

    // Check if name already exists
    const existingUcp = await prisma.uCP.findUnique({
      where: { name },
    });

    if (existingUcp) {
      return res.status(400).json({
        success: false,
        error: 'A settlement group with this name already exists',
      });
    }

    // Create new UCP
    const newUcp = await prisma.uCP.create({
      data: {
        name,
        value: parseFloat(value),
        description,
        serviceType,
        isActive: isActive !== undefined ? isActive : true,
        metadata: metadata || null,
        createdBy: req.user.username, // Track who created this settlement group
      },
    });

    res.status(201).json({
      success: true,
      data: newUcp,
      message: 'Settlement group created successfully',
    });
  } catch (error) {
    console.error('Create UCP error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   PUT /api/ucp/:id
// @desc    Update UCP (settlement group)
// @access  Private
router.put('/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { name, value, description, serviceType, isActive, metadata } = req.body;

    // Check if UCP exists
    const existingUcp = await prisma.uCP.findUnique({
      where: { id },
    });

    if (!existingUcp) {
      return res.status(404).json({
        success: false,
        error: 'Settlement group not found',
      });
    }

    // Check if name already exists (if name is being changed)
    if (name && name !== existingUcp.name) {
      const nameExists = await prisma.uCP.findUnique({
        where: { name },
      });

      if (nameExists) {
        return res.status(400).json({
          success: false,
          error: 'A settlement group with this name already exists',
        });
      }
    }

    // Validate metadata structure if provided
    if (metadata && typeof metadata === 'object') {
      const allowedFields = ['feeType', 'gateway', 'minAmount', 'maxAmount'];
      const metadataFields = Object.keys(metadata);
      const invalidFields = metadataFields.filter(field => !allowedFields.includes(field));
      
      if (invalidFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid metadata fields: ${invalidFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`,
        });
      }
    }

    // Update UCP
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (value !== undefined) updateData.value = parseFloat(value);
    if (description !== undefined) updateData.description = description;
    if (serviceType !== undefined) updateData.serviceType = serviceType;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (metadata !== undefined) updateData.metadata = metadata || null;

    const updatedUcp = await prisma.uCP.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: updatedUcp,
      message: 'Settlement group updated successfully',
    });
  } catch (error) {
    console.error('Update UCP error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   DELETE /api/ucp/:id
// @desc    Delete UCP (settlement group)
// @access  Private
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;

    // Check if UCP exists
    const existingUcp = await prisma.uCP.findUnique({
      where: { id },
    });

    if (!existingUcp) {
      return res.status(404).json({
        success: false,
        error: 'Settlement group not found',
      });
    }

    // Delete UCP
    await prisma.uCP.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Settlement group deleted successfully',
    });
  } catch (error) {
    console.error('Delete UCP error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/ucp/:id
// @desc    Get UCP by ID
// @access  Private
router.get('/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;

    const ucp = await prisma.uCP.findUnique({
      where: { id },
    });

    if (!ucp) {
      return res.status(404).json({
        success: false,
        error: 'Settlement group not found',
      });
    }

    res.json({
      success: true,
      data: ucp,
    });
  } catch (error) {
    console.error('Get UCP by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router; 