import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// @route   GET /api/admin-users
// @desc    Get all admin users with their operator entities
// @access  Private
router.get('/', authenticate, async (req: any, res) => {
  try {
    const admins = await prisma.admin.findMany({
      include: {
        operatorEntity: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const transformedAdmins = admins.map(admin => ({
      id: admin.id,
      email: admin.email,
      username: admin.username,
      name: admin.name,
      isActive: admin.isActive,
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      createdBy: admin.createdBy,
      operatorEntityId: admin.operatorEntityId,
      operatorEntityName: admin.operatorEntity.name,
      roleName: admin.operatorEntity.role.name,
      mfaEnabled: admin.mfaEnabled,
      mfaVerified: admin.mfaVerified,
    }));

    res.json({
      success: true,
      data: transformedAdmins,
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   POST /api/admin-users
// @desc    Create a new admin user
// @access  Private
router.post('/', [
  authenticate,
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required'),
  body('operatorEntityId').notEmpty().withMessage('Operator entity is required'),
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    const { email, username, password, name, operatorEntityId } = req.body;

    // Check if email already exists
    const existingEmail = await prisma.admin.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists',
      });
    }

    // Check if username already exists
    const existingUsername = await prisma.admin.findUnique({
      where: { username }
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists',
      });
    }

    // Check if operator entity exists
    const entity = await prisma.operatorEntity.findUnique({
      where: { id: operatorEntityId },
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

    if (!entity) {
      return res.status(400).json({
        success: false,
        error: 'Operator entity not found',
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the admin user
    const admin = await prisma.admin.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name,
        isActive: true,
        operatorEntityId,
        createdBy: req.user.username, // Track who created this admin
      },
      include: {
        operatorEntity: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        name: admin.name,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
        createdBy: admin.createdBy,
        operatorEntityId: admin.operatorEntityId,
        operatorEntityName: admin.operatorEntity.name,
        roleName: admin.operatorEntity.role.name,
      },
      message: 'Admin user created successfully',
    });
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   PUT /api/admin-users/:id
// @desc    Update an admin user
// @access  Private
router.put('/:id', [
  authenticate,
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('username').notEmpty().withMessage('Username is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('operatorEntityId').notEmpty().withMessage('Operator entity is required'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  body('mfaEnabled').optional().isBoolean().withMessage('mfaEnabled must be a boolean'),
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
    const { email, username, name, operatorEntityId, isActive, mfaEnabled } = req.body;

    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id }
    });

    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        error: 'Admin user not found',
      });
    }

    // Check if email conflicts with other users
    if (email !== existingAdmin.email) {
      const emailConflict = await prisma.admin.findUnique({
        where: { email }
      });

      if (emailConflict) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists',
        });
      }
    }

    // Check if username conflicts with other users
    if (username !== existingAdmin.username) {
      const usernameConflict = await prisma.admin.findUnique({
        where: { username }
      });

      if (usernameConflict) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists',
        });
      }
    }

    // Check if operator entity exists
    const entity = await prisma.operatorEntity.findUnique({
      where: { id: operatorEntityId },
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

    if (!entity) {
      return res.status(400).json({
        success: false,
        error: 'Operator entity not found',
      });
    }

    // Prepare update data
    const updateData: any = {
      email,
      username,
      name,
      isActive,
      operatorEntityId,
      mfaEnabled: mfaEnabled || false,
    };

    // If MFA is being disabled, also reset MFA-related fields
    if (!mfaEnabled) {
      updateData.mfaVerified = false;
      updateData.mfaSecret = null;
      updateData.mfaBackupCodes = [];
    }

    // Update the admin user
    const updatedAdmin = await prisma.admin.update({
      where: { id },
      data: updateData,
      include: {
        operatorEntity: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        username: updatedAdmin.username,
        name: updatedAdmin.name,
        isActive: updatedAdmin.isActive,
        lastLogin: updatedAdmin.lastLogin,
        createdAt: updatedAdmin.createdAt,
        updatedAt: updatedAdmin.updatedAt,
        operatorEntityId: updatedAdmin.operatorEntityId,
        operatorEntityName: updatedAdmin.operatorEntity.name,
        roleName: updatedAdmin.operatorEntity.role.name,
        mfaEnabled: updatedAdmin.mfaEnabled,
        mfaVerified: updatedAdmin.mfaVerified,
      },
      message: 'Admin user updated successfully',
    });
  } catch (error) {
    console.error('Update admin user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   DELETE /api/admin-users/:id
// @desc    Delete an admin user
// @access  Private
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;

    // Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { id }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin user not found',
      });
    }

    // Prevent deletion of the last admin
    const adminCount = await prisma.admin.count();
    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the last admin user',
      });
    }

    // Delete the admin user
    await prisma.admin.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Admin user deleted successfully',
    });
  } catch (error) {
    console.error('Delete admin user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/admin-users/operator-entities
// @desc    Get all available operator entities for user assignment
// @access  Private
router.get('/operator-entities', authenticate, async (req: any, res) => {
  try {
    const entities = await prisma.operatorEntity.findMany({
      where: { isActive: true },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const transformedEntities = entities.map(entity => ({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      roleId: entity.roleId,
      roleName: entity.role.name,
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

 
// @route   PUT /api/admin-users/:id/reset-password
// @desc    Reset an admin user's password (override current)
// @access  Private
router.put(
  '/:id/reset-password',
  [
    authenticate,
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg,
        });
      }

      const { id } = req.params;
      const { password } = req.body;

      const admin = await prisma.admin.findUnique({ where: { id } });
      if (!admin) {
        return res.status(404).json({ success: false, error: 'Admin user not found' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const updated = await prisma.admin.update({
        where: { id },
        data: {
          password: hashedPassword,
          // Optional security posture: require MFA re-verification after password reset
          mfaVerified: admin.mfaEnabled ? false : admin.mfaVerified,
          updatedAt: new Date(),
        },
        include: {
          operatorEntity: {
            include: {
              role: {
                select: { id: true, name: true, description: true },
              },
            },
          },
        },
      });

      return res.json({
        success: true,
        data: {
          id: updated.id,
          email: updated.email,
          username: updated.username,
          name: updated.name,
          isActive: updated.isActive,
          lastLogin: updated.lastLogin,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          operatorEntityId: updated.operatorEntityId,
          operatorEntityName: updated.operatorEntity.name,
          roleName: updated.operatorEntity.role.name,
          mfaEnabled: updated.mfaEnabled,
          mfaVerified: updated.mfaVerified,
        },
        message: 'Password reset successfully',
      });
    } catch (error) {
      console.error('Reset admin password error:', error);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

export default router;