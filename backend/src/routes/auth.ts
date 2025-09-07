import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { MFAService } from '../services/mfaService';

const router = express.Router();
const prisma = new PrismaClient();

// @route   POST /api/auth/login
// @desc    Admin login with username or email - now requires MFA
// @access  Public
router.post('/login', [
  body('username').notEmpty().withMessage('Username or email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    const { username, password } = req.body;

    // Find admin by username or email with entity and role permissions
    const admin = await prisma.admin.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username }
        ]
      },
      include: {
        operatorEntity: {
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if MFA is already set up
    if (!admin.mfaEnabled) {
      // First time login - setup MFA
      const mfaData = await MFAService.generateMFASecret(admin.id, admin.email);
      
      return res.json({
        success: true,
        requiresMFASetup: true,
        adminId: admin.id,
        mfaData,
        message: 'MFA setup required for first login'
      });
    }

    // MFA is enabled - return challenge
    return res.json({
      success: true,
      requiresMFA: true,
      adminId: admin.id,
      message: 'MFA verification required'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   POST /api/auth/verify-mfa
// @desc    Verify MFA token and complete login
// @access  Public
router.post('/verify-mfa', [
  body('adminId').notEmpty().withMessage('Admin ID is required'),
  body('token').notEmpty().withMessage('MFA token is required'),
], async (req, res) => {
  try {
    const { adminId, token } = req.body;

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        operatorEntity: {
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });

    if (!admin || !admin.mfaEnabled || !admin.mfaSecret) {
      return res.status(400).json({
        success: false,
        error: 'Invalid MFA request'
      });
    }

    // Try both verification methods
    let isValid = MFAService.verifyTOTP(token, admin.mfaSecret);
    
    if (!isValid) {
      console.log(`MFA Debug: Primary verification failed, trying alternative method`);
      isValid = MFAService.verifyTOTPAlternative(token, admin.mfaSecret);
    }
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid MFA token. Please ensure you enter the 6-digit code from your authenticator app within 30 seconds of generation.'
      });
    }

    // Update last login
    await prisma.admin.update({
      where: { id: adminId },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token with role from entity
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const jwtToken = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email, 
        username: admin.username, 
        role: admin.operatorEntity.role.name,
        entityId: admin.operatorEntityId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as any
    );

    // Transform permissions to frontend format
    const permissions = {};
    admin.operatorEntity.role.permissions.forEach(perm => {
      if (!permissions[perm.entityType]) {
        permissions[perm.entityType] = {};
      }
      permissions[perm.entityType][perm.permission] = perm.isGranted;
    });

    res.json({
      success: true,
      data: {
        token: jwtToken,
        admin: {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          name: admin.name,
          role: admin.operatorEntity.role.name,
          entityId: admin.operatorEntityId,
          entityName: admin.operatorEntity.name,
          permissions,
        },
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Verify MFA error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   POST /api/auth/enable-mfa
// @desc    Enable MFA after verification
// @access  Public (called during first login)
router.post('/enable-mfa', [
  body('adminId').notEmpty().withMessage('Admin ID is required'),
  body('token').notEmpty().withMessage('MFA token is required'),
], async (req, res) => {
  try {
    const { adminId, token } = req.body;

    console.log(`MFA Debug: Attempting to enable MFA for admin ${adminId} with token: ${token}`);

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        operatorEntity: {
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });

    if (!admin || !admin.mfaSecret) {
      console.log(`MFA Debug: Admin not found or no MFA secret for ${adminId}`);
      return res.status(400).json({
        success: false,
        error: 'MFA not set up'
      });
    }

    console.log(`MFA Debug: Admin found, MFA secret exists: ${!!admin.mfaSecret}`);

    // Try both verification methods
    let isValid = MFAService.verifyTOTP(token, admin.mfaSecret);
    
    if (!isValid) {
      console.log(`MFA Debug: Primary verification failed, trying alternative method`);
      isValid = MFAService.verifyTOTPAlternative(token, admin.mfaSecret);
    }
    
    if (!isValid) {
      console.log(`MFA Debug: Both verification methods failed`);
      return res.status(401).json({
        success: false,
        error: 'Invalid MFA token. Please ensure you enter the 6-digit code from your authenticator app within 30 seconds of generation.'
      });
    }

    console.log(`MFA Debug: MFA verification successful, enabling MFA`);

    // Enable MFA
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        mfaEnabled: true,
        mfaVerified: true
      }
    });

    // Update last login
    await prisma.admin.update({
      where: { id: adminId },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token for immediate login
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const jwtToken = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email, 
        username: admin.username, 
        role: admin.operatorEntity.role.name,
        entityId: admin.operatorEntityId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as any
    );

    // Transform permissions to frontend format
    const permissions = {};
    admin.operatorEntity.role.permissions.forEach(perm => {
      if (!permissions[perm.entityType]) {
        permissions[perm.entityType] = {};
      }
      permissions[perm.entityType][perm.permission] = perm.isGranted;
    });

    res.json({
      success: true,
      data: {
        token: jwtToken,
        admin: {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          name: admin.name,
          role: admin.operatorEntity.role.name,
          entityId: admin.operatorEntityId,
          entityName: admin.operatorEntity.name,
          permissions,
        },
      },
      message: 'MFA enabled successfully and user logged in'
    });
  } catch (error) {
    console.error('Enable MFA error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   POST /api/auth/verify-backup-code
// @desc    Verify backup code for MFA recovery
// @access  Public
router.post('/verify-backup-code', [
  body('adminId').notEmpty().withMessage('Admin ID is required'),
  body('backupCode').notEmpty().withMessage('Backup code is required'),
], async (req, res) => {
  try {
    const { adminId, backupCode } = req.body;

    const isValid = await MFAService.verifyBackupCode(adminId, backupCode);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid backup code'
      });
    }

    // Get admin data and generate JWT
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        operatorEntity: {
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Update last login
    await prisma.admin.update({
      where: { id: adminId },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token with role from entity
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const jwtToken = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email, 
        username: admin.username, 
        role: admin.operatorEntity.role.name,
        entityId: admin.operatorEntityId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as any
    );

    // Transform permissions to frontend format
    const permissions = {};
    admin.operatorEntity.role.permissions.forEach(perm => {
      if (!permissions[perm.entityType]) {
        permissions[perm.entityType] = {};
      }
      permissions[perm.entityType][perm.permission] = perm.isGranted;
    });

    res.json({
      success: true,
      data: {
        token: jwtToken,
        admin: {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          name: admin.name,
          role: admin.operatorEntity.role.name,
          entityId: admin.operatorEntityId,
          entityName: admin.operatorEntity.name,
          permissions,
        },
      },
      message: 'Login successful with backup code',
    });
  } catch (error) {
    console.error('Verify Backup Code error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/auth/debug-mfa/:adminId
// @desc    Debug MFA setup for troubleshooting
// @access  Public (for debugging purposes)
router.get('/debug-mfa/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    
    const debugInfo = await MFAService.debugMFASetup(adminId);
    
    if (debugInfo.error) {
      return res.status(404).json({
        success: false,
        error: debugInfo.error
      });
    }

    res.json({
      success: true,
      data: debugInfo
    });
  } catch (error) {
    console.error('Debug MFA error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current admin profile
// @access  Private
router.get('/me', authenticate, async (req: any, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
      include: {
        operatorEntity: {
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found',
      });
    }

    // Transform permissions to frontend format
    const permissions = {};
    admin.operatorEntity.role.permissions.forEach(perm => {
      if (!permissions[perm.entityType]) {
        permissions[perm.entityType] = {};
      }
      permissions[perm.entityType][perm.permission] = perm.isGranted;
    });

    res.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        name: admin.name,
        role: admin.operatorEntity.role.name,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt,
        entityId: admin.operatorEntityId,
        entityName: admin.operatorEntity.name,
        permissions,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Admin logout (client-side token removal)
// @access  Private
router.post('/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

export default router; 