import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

export const requirePermission = (entityType: string, permission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Get the admin's operator entity and role
      const adminWithRole = await prisma.admin.findUnique({
        where: { id: req.user.id },
        include: {
          operatorEntity: {
            include: {
              role: {
                include: {
                  permissions: true,
                },
              },
            },
          },
        },
      });

      if (!adminWithRole || !adminWithRole.operatorEntity || !adminWithRole.operatorEntity.role) {
        return res.status(403).json({
          success: false,
          error: 'No role assigned',
        });
      }

      const role = adminWithRole.operatorEntity.role;
      
      // Check if the role has the required permission
      const hasPermission = role.permissions.some(
        (perm) =>
          perm.entityType === entityType &&
          perm.permission === permission &&
          perm.isGranted === true
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required permission: ${permission} on ${entityType}`,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error during permission check',
      });
    }
  };
};

// Helper function to check multiple permissions (any of them)
export const requireAnyPermission = (permissions: Array<{ entityType: string; permission: string }>) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Get the admin's operator entity and role
      const adminWithRole = await prisma.admin.findUnique({
        where: { id: req.user.id },
        include: {
          operatorEntity: {
            include: {
              role: {
                include: {
                  permissions: true,
                },
              },
            },
          },
        },
      });

      if (!adminWithRole || !adminWithRole.operatorEntity || !adminWithRole.operatorEntity.role) {
        return res.status(403).json({
          success: false,
          error: 'No role assigned',
        });
      }

      const role = adminWithRole.operatorEntity.role;
      
      // Check if the role has any of the required permissions
      const hasAnyPermission = permissions.some(({ entityType, permission }) =>
        role.permissions.some(
          (perm) =>
            perm.entityType === entityType &&
            perm.permission === permission &&
            perm.isGranted === true
        )
      );

      if (!hasAnyPermission) {
        const requiredPermissions = permissions.map(p => `${p.permission} on ${p.entityType}`).join(' or ');
        return res.status(403).json({
          success: false,
          error: `Access denied. Required permissions: ${requiredPermissions}`,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error during permission check',
      });
    }
  };
};

// Helper function to check all permissions (all of them)
export const requireAllPermissions = (permissions: Array<{ entityType: string; permission: string }>) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Get the admin's operator entity and role
      const adminWithRole = await prisma.admin.findUnique({
        where: { id: req.user.id },
        include: {
          operatorEntity: {
            include: {
              role: {
                include: {
                  permissions: true,
                },
              },
            },
          },
        },
      });

      if (!adminWithRole || !adminWithRole.operatorEntity || !adminWithRole.operatorEntity.role) {
        return res.status(403).json({
          success: false,
          error: 'No role assigned',
        });
      }

      const role = adminWithRole.operatorEntity.role;
      
      // Check if the role has all of the required permissions
      const hasAllPermissions = permissions.every(({ entityType, permission }) =>
        role.permissions.some(
          (perm) =>
            perm.entityType === entityType &&
            perm.permission === permission &&
            perm.isGranted === true
        )
      );

      if (!hasAllPermissions) {
        const requiredPermissions = permissions.map(p => `${p.permission} on ${p.entityType}`).join(' and ');
        return res.status(403).json({
          success: false,
          error: `Access denied. Required permissions: ${requiredPermissions}`,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error during permission check',
      });
    }
  };
}; 