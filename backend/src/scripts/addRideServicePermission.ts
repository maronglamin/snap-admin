import { PrismaClient, EntityType, Permission } from '@prisma/client';

const prisma = new PrismaClient();

async function addRideServicePermission() {
  try {
    // Find the Super Admin role
    const superAdminRole = await prisma.role.findFirst({
      where: { name: 'Super Admin' }
    });

    if (!superAdminRole) {
      console.log('Super Admin role not found');
      return;
    }

    console.log('Found Super Admin role:', superAdminRole.id);

    // Add the new permission
    const permissionData = [
      {
        roleId: superAdminRole.id,
        entityType: 'SNAP_RIDE_RIDE_SERVICE' as EntityType,
        permission: 'VIEW' as Permission,
        isGranted: true,
      },
      {
        roleId: superAdminRole.id,
        entityType: 'SNAP_RIDE_RIDE_SERVICE' as EntityType,
        permission: 'ADD' as Permission,
        isGranted: true,
      },
      {
        roleId: superAdminRole.id,
        entityType: 'SNAP_RIDE_RIDE_SERVICE' as EntityType,
        permission: 'EDIT' as Permission,
        isGranted: true,
      },
      {
        roleId: superAdminRole.id,
        entityType: 'SNAP_RIDE_RIDE_SERVICE' as EntityType,
        permission: 'DELETE' as Permission,
        isGranted: true,
      },
      {
        roleId: superAdminRole.id,
        entityType: 'SNAP_RIDE_RIDE_SERVICE' as EntityType,
        permission: 'EXPORT' as Permission,
        isGranted: true,
      },
    ];

    // Check if permissions already exist
    const existingPermissions = await prisma.rolePermission.findMany({
      where: {
        roleId: superAdminRole.id,
        entityType: 'SNAP_RIDE_RIDE_SERVICE' as EntityType
      }
    });

    if (existingPermissions.length > 0) {
      console.log('Permissions already exist, updating...');
      // Update existing permissions
      for (const perm of permissionData) {
        await prisma.rolePermission.updateMany({
          where: {
            roleId: superAdminRole.id,
            entityType: perm.entityType as EntityType,
            permission: perm.permission as Permission
          },
          data: {
            isGranted: perm.isGranted
          }
        });
      }
    } else {
      console.log('Creating new permissions...');
      // Create new permissions
      await prisma.rolePermission.createMany({
        data: permissionData
      });
    }

    console.log('Successfully added SNAP_RIDE_RIDE_SERVICE permissions to Super Admin role');
  } catch (error) {
    console.error('Error adding permission:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRideServicePermission();
