"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function addRideServiceTiersPermission() {
    try {
        const superAdminRole = await prisma.role.findFirst({
            where: { name: 'Super Admin' }
        });
        if (!superAdminRole) {
            console.log('Super Admin role not found');
            return;
        }
        console.log('Found Super Admin role:', superAdminRole.id);
        const permissionData = [
            { roleId: superAdminRole.id, entityType: 'SNAP_RIDE_RIDE_SERVICE_TIERS', permission: 'VIEW', isGranted: true },
            { roleId: superAdminRole.id, entityType: 'SNAP_RIDE_RIDE_SERVICE_TIERS', permission: 'ADD', isGranted: true },
            { roleId: superAdminRole.id, entityType: 'SNAP_RIDE_RIDE_SERVICE_TIERS', permission: 'EDIT', isGranted: true },
            { roleId: superAdminRole.id, entityType: 'SNAP_RIDE_RIDE_SERVICE_TIERS', permission: 'DELETE', isGranted: true },
            { roleId: superAdminRole.id, entityType: 'SNAP_RIDE_RIDE_SERVICE_TIERS', permission: 'EXPORT', isGranted: true },
        ];
        const existingPermissions = await prisma.rolePermission.findMany({
            where: {
                roleId: superAdminRole.id,
                entityType: 'SNAP_RIDE_RIDE_SERVICE_TIERS'
            }
        });
        if (existingPermissions.length > 0) {
            console.log('Permissions already exist, updating...');
            for (const perm of permissionData) {
                await prisma.rolePermission.updateMany({
                    where: {
                        roleId: superAdminRole.id,
                        entityType: perm.entityType,
                        permission: perm.permission
                    },
                    data: { isGranted: perm.isGranted }
                });
            }
        }
        else {
            console.log('Creating new permissions...');
            await prisma.rolePermission.createMany({ data: permissionData });
        }
        console.log('Successfully added SNAP_RIDE_RIDE_SERVICE_TIERS permissions to Super Admin role');
    }
    catch (error) {
        console.error('Error adding permission:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
addRideServiceTiersPermission();
//# sourceMappingURL=addRideServiceTiersPermission.js.map