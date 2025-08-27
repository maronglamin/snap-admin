import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// @route   GET /api/roles
// @desc    Get all roles with their permissions
// @access  Private
router.get('/', authenticate, async (req: any, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        operatorEntities: {
          include: {
            admins: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform the data to match frontend expectations
    const transformedRoles = roles.map(role => {
      const permissions = {};
      
      // Group permissions by entity type
      role.permissions.forEach(perm => {
        if (!permissions[perm.entityType]) {
          permissions[perm.entityType] = {};
        }
        permissions[perm.entityType][perm.permission] = perm.isGranted;
      });

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        createdBy: role.createdBy,
        permissions,
        assignedUsers: role.operatorEntities.reduce((sum, entity) => sum + entity.admins.length, 0)
      };
    });

    res.json({
      success: true,
      data: transformedRoles,
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   POST /api/roles
// @desc    Create a new role with permissions
// @access  Private
router.post('/', [
  authenticate,
  body('name').notEmpty().withMessage('Role name is required'),
  body('description').optional(),
  body('permissions').isObject().withMessage('Permissions must be an object'),
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    const { name, description, permissions } = req.body;

    // Check if role name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name }
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        error: 'Role name already exists',
      });
    }

    // Create the role
    const role = await prisma.role.create({
      data: {
        name,
        description,
        isActive: true,
        createdBy: req.user.username, // Track who created this role
      }
    });

    // Create permissions for the role
    const permissionData = [];
    for (const [entityType, entityPermissions] of Object.entries(permissions)) {
      for (const [permission, isGranted] of Object.entries(entityPermissions as any)) {
        permissionData.push({
          roleId: role.id,
          entityType: entityType as any,
          permission: permission as any,
          isGranted: Boolean(isGranted),
        });
      }
    }

    if (permissionData.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionData
      });
    }

    // Get the created role with permissions
    const createdRole = await prisma.role.findUnique({
      where: { id: role.id },
      include: { permissions: true }
    });

    // Transform the response
    const permissionsObj = {};
    createdRole!.permissions.forEach(perm => {
      if (!permissionsObj[perm.entityType]) {
        permissionsObj[perm.entityType] = {};
      }
      permissionsObj[perm.entityType][perm.permission] = perm.isGranted;
    });

    res.status(201).json({
      success: true,
      data: {
        id: createdRole!.id,
        name: createdRole!.name,
        description: createdRole!.description,
        isActive: createdRole!.isActive,
        permissions: permissionsObj,
        createdAt: createdRole!.createdAt,
        updatedAt: createdRole!.updatedAt,
        createdBy: createdRole!.createdBy,
      },
      message: 'Role created successfully',
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   PUT /api/roles/:id
// @desc    Update a role and its permissions
// @access  Private
router.put('/:id', [
  authenticate,
  body('name').notEmpty().withMessage('Role name is required'),
  body('description').optional(),
  body('permissions').isObject().withMessage('Permissions must be an object'),
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
    const { name, description, permissions } = req.body;

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id }
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    // Check if new name conflicts with other roles
    if (name !== existingRole.name) {
      const nameConflict = await prisma.role.findUnique({
        where: { name }
      });

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          error: 'Role name already exists',
        });
      }
    }

    // Update the role
    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
      }
    });

    // Delete existing permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: id }
    });

    // Create new permissions
    const permissionData = [];
    for (const [entityType, entityPermissions] of Object.entries(permissions)) {
      for (const [permission, isGranted] of Object.entries(entityPermissions as any)) {
        permissionData.push({
          roleId: id,
          entityType: entityType as any,
          permission: permission as any,
          isGranted: Boolean(isGranted),
        });
      }
    }

    if (permissionData.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionData
      });
    }

    // Get the updated role with permissions
    const finalRole = await prisma.role.findUnique({
      where: { id },
      include: { permissions: true }
    });

    // Transform the response
    const permissionsObj = {};
    finalRole!.permissions.forEach(perm => {
      if (!permissionsObj[perm.entityType]) {
        permissionsObj[perm.entityType] = {};
      }
      permissionsObj[perm.entityType][perm.permission] = perm.isGranted;
    });

    res.json({
      success: true,
      data: {
        id: finalRole!.id,
        name: finalRole!.name,
        description: finalRole!.description,
        isActive: finalRole!.isActive,
        permissions: permissionsObj,
        createdAt: finalRole!.createdAt,
        updatedAt: finalRole!.updatedAt,
        createdBy: finalRole!.createdBy,
      },
      message: 'Role updated successfully',
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   DELETE /api/roles/:id
// @desc    Delete a role
// @access  Private
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        operatorEntities: {
          include: {
            admins: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              }
            }
          }
        }
      }
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    // Check if role is assigned to any entities with users
    const entitiesWithUsers = role.operatorEntities.filter(entity => entity.admins.length > 0);
    
    if (entitiesWithUsers.length > 0) {
      const entityNames = entitiesWithUsers.map(entity => entity.name).join(', ');
      const totalUsers = entitiesWithUsers.reduce((sum, entity) => sum + entity.admins.length, 0);
      
      return res.status(400).json({
        success: false,
        error: `Cannot delete role "${role.name}" because it is assigned to ${totalUsers} user(s) in the following entities: ${entityNames}. Please reassign or remove these users first.`,
      });
    }

    // If there are operator entities assigned but no users, we need to delete them first
    if (role.operatorEntities.length > 0) {
      const entityNames = role.operatorEntities.map(entity => entity.name).join(', ');
      
      // Delete the operator entities first (they have no users, so it's safe)
      await prisma.operatorEntity.deleteMany({
        where: { roleId: id }
      });
      
      console.log(`Deleted ${role.operatorEntities.length} empty operator entities for role "${role.name}"`);
    }

    // Delete the role (permissions will be deleted automatically due to cascade)
    await prisma.role.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: `Role "${role.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting role',
    });
  }
});

// @route   GET /api/roles/available-permissions
// @desc    Get available entity types and permissions
// @access  Private
router.get('/available-permissions', authenticate, async (req: any, res) => {
  try {
    const entityTypes = [
      // Main menus
      { value: 'DASHBOARD', label: 'Dashboard', type: 'main' },
      { value: 'USERS', label: 'Users', type: 'main' },
      { value: 'PRODUCTS', label: 'Products', type: 'main' },
      { value: 'ORDERS', label: 'Orders', type: 'main' },
      { value: 'SETTLEMENTS', label: 'Settlements', type: 'main' },
      { value: 'JOURNALS', label: 'Journals', type: 'main' },
      { value: 'SYSTEM_CONFIG', label: 'System Configuration', type: 'main' },
      { value: 'SNAP_RIDE', label: 'SNAP Ride', type: 'main' },
      { value: 'SNAP_RENTAL', label: 'SNAP Rental', type: 'main' },
      
      // Users submenus
      { value: 'USERS_SNAP_USERS', label: 'SNAP Users', type: 'submenu', parent: 'USERS' },
      { value: 'USERS_KYC_APPROVAL', label: 'KYC Approval', type: 'submenu', parent: 'USERS' },
      
      // Products submenus
      { value: 'PRODUCTS_CATEGORIES', label: 'Categories', type: 'submenu', parent: 'PRODUCTS' },
      
      // Settlements submenus
      { value: 'SETTLEMENTS_REQUESTS', label: 'Settlement Request', type: 'submenu', parent: 'SETTLEMENTS' },
      { value: 'SETTLEMENTS_SHEET', label: 'Settlement Sheet', type: 'submenu', parent: 'SETTLEMENTS' },
      { value: 'SETTLEMENTS_CUMULATIVE_ENTRIES', label: 'Cumulative Entries', type: 'submenu', parent: 'SETTLEMENTS' },
      
      // Journals submenus
      { value: 'JOURNALS_STRIPE_PAYMENT_REPORT', label: 'Stripe Payment Report', type: 'submenu', parent: 'JOURNALS' },
      { value: 'JOURNALS_SNAP_FEE_REPORT', label: 'Snap Fee Report', type: 'submenu', parent: 'JOURNALS' },
      { value: 'JOURNALS_AUDIT_REPORT', label: 'Transaction Logs', type: 'submenu', parent: 'JOURNALS' },
      
      // System Config submenus
      { value: 'SYSTEM_CONFIG_ROLES', label: 'Roles', type: 'submenu', parent: 'SYSTEM_CONFIG' },
      { value: 'SYSTEM_CONFIG_OPERATOR_ENTITY', label: 'User Container', type: 'submenu', parent: 'SYSTEM_CONFIG' },
      { value: 'SYSTEM_CONFIG_SYSTEM_OPERATOR', label: 'Admin Container', type: 'submenu', parent: 'SYSTEM_CONFIG' },
      { value: 'SYSTEM_CONFIG_SETTLEMENT_GROUP', label: 'Settlement Group', type: 'submenu', parent: 'SYSTEM_CONFIG' },
      { value: 'SYSTEM_CONFIG_PAYMENT_GATEWAYS', label: 'Payment Gateways', type: 'submenu', parent: 'SYSTEM_CONFIG' },
      
      // SNAP Ride submenus
      { value: 'SNAP_RIDE_RIDER_APPLICATIONS', label: 'Ride Applications', type: 'submenu', parent: 'SNAP_RIDE' },
      { value: 'SNAP_RIDE_DRIVER_MANAGEMENT', label: 'Driver Management', type: 'submenu', parent: 'SNAP_RIDE' },
      { value: 'SNAP_RIDE_RIDE_MANAGEMENT', label: 'Ride Journal', type: 'submenu', parent: 'SNAP_RIDE' },
      { value: 'SNAP_RIDE_ANALYTICS', label: 'Analytics', type: 'submenu', parent: 'SNAP_RIDE' },
      { value: 'SNAP_RIDE_RIDE_SERVICE', label: 'Ride Service', type: 'submenu', parent: 'SNAP_RIDE' },
      { value: 'SNAP_RIDE_RIDE_SERVICE_TIERS', label: 'Ride Service Tiers', type: 'submenu', parent: 'SNAP_RIDE' },
      
      // SNAP Rental submenus
      { value: 'SNAP_RENTAL_REQUEST', label: 'Request', type: 'submenu', parent: 'SNAP_RENTAL' },
      
      // Analytics
      { value: 'ANALYTICS', label: 'Analytics', type: 'main' },
      { value: 'ANALYTICS_REVENUE', label: 'Revenue Analysis', type: 'submenu', parent: 'ANALYTICS' },
    ];

    const permissions = [
      { value: 'VIEW', label: 'View' },
      { value: 'ADD', label: 'Add' },
      { value: 'EDIT', label: 'Edit' },
      { value: 'DELETE', label: 'Delete' },
      { value: 'EXPORT', label: 'Export' },
    ];

    res.json({
      success: true,
      data: {
        entityTypes,
        permissions,
      },
    });
  } catch (error) {
    console.error('Get available permissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router; 