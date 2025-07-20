import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// @route   GET /api/operator-entities
// @desc    Get all operator entities with their roles and assigned users
// @access  Private
router.get('/', authenticate, async (req: any, res) => {
  try {
    const entities = await prisma.operatorEntity.findMany({
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        admins: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            isActive: true,
            lastLogin: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const transformedEntities = entities.map(entity => ({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      roleId: entity.roleId,
      roleName: entity.role.name,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      assignedUsers: entity.admins.length,
      users: entity.admins,
    }));

    res.json({
      success: true,
      data: transformedEntities,
    });
  } catch (error) {
    console.error('Get operator entities error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   POST /api/operator-entities
// @desc    Create a new operator entity
// @access  Private
router.post('/', [
  authenticate,
  body('name').notEmpty().withMessage('Entity name is required'),
  body('description').optional(),
  body('roleId').notEmpty().withMessage('Role ID is required'),
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    const { name, description, roleId } = req.body;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Role not found',
      });
    }

    // Create the operator entity
    const entity = await prisma.operatorEntity.create({
      data: {
        name,
        description,
        roleId,
        isActive: true,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: entity.id,
        name: entity.name,
        description: entity.description,
        roleId: entity.roleId,
        roleName: entity.role.name,
        isActive: entity.isActive,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        assignedUsers: 0,
        users: [],
      },
      message: 'Operator entity created successfully',
    });
  } catch (error) {
    console.error('Create operator entity error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   PUT /api/operator-entities/:id
// @desc    Update an operator entity
// @access  Private
router.put('/:id', [
  authenticate,
  body('name').notEmpty().withMessage('Entity name is required'),
  body('description').optional(),
  body('roleId').notEmpty().withMessage('Role ID is required'),
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    const { id } = req.params;
    const { name, description, roleId } = req.body;

    // Check if entity exists
    const existingEntity = await prisma.operatorEntity.findUnique({
      where: { id }
    });

    if (!existingEntity) {
      return res.status(404).json({
        success: false,
        error: 'Operator entity not found',
      });
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Role not found',
      });
    }

    // Update the operator entity
    const updatedEntity = await prisma.operatorEntity.update({
      where: { id },
      data: {
        name,
        description,
        roleId,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        admins: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            isActive: true,
            lastLogin: true,
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        id: updatedEntity.id,
        name: updatedEntity.name,
        description: updatedEntity.description,
        roleId: updatedEntity.roleId,
        roleName: updatedEntity.role.name,
        isActive: updatedEntity.isActive,
        createdAt: updatedEntity.createdAt,
        updatedAt: updatedEntity.updatedAt,
        assignedUsers: updatedEntity.admins.length,
        users: updatedEntity.admins,
      },
      message: 'Operator entity updated successfully',
    });
  } catch (error) {
    console.error('Update operator entity error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   DELETE /api/operator-entities/:id
// @desc    Delete an operator entity
// @access  Private
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;

    // Check if entity exists and has assigned users
    const entity = await prisma.operatorEntity.findUnique({
      where: { id },
      include: {
        admins: true
      }
    });

    if (!entity) {
      return res.status(404).json({
        success: false,
        error: 'Operator entity not found',
      });
    }

    if (entity.admins.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete entity that has assigned users',
      });
    }

    // Delete the entity
    await prisma.operatorEntity.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Operator entity deleted successfully',
    });
  } catch (error) {
    console.error('Delete operator entity error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/operator-entities/roles
// @desc    Get all available roles for entity assignment
// @access  Private
router.get('/roles', authenticate, async (req: any, res) => {
  try {
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router; 