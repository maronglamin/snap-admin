"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkRideServiceTiersPermission() {
    try {
        console.log('🔍 Checking SNAP_RIDE_RIDE_SERVICE_TIERS permissions...');
        console.log('\n1. Checking EntityType enum values...');
        const entityTypes = await prisma.$queryRaw `
      SELECT unnest(enum_range(NULL::"EntityType")) as enum_value;
    `;
        console.log('Available EntityType values:', entityTypes);
        console.log('\n2. Checking Super Admin role...');
        const superAdminRole = await prisma.role.findFirst({
            where: { name: 'Super Admin' }
        });
        if (!superAdminRole) {
            console.log('❌ Super Admin role not found');
            return;
        }
        console.log('✅ Super Admin role found:', superAdminRole.id);
        console.log('\n3. Checking existing permissions for SNAP_RIDE_RIDE_SERVICE_TIERS...');
        const existingPermissions = await prisma.rolePermission.findMany({
            where: {
                roleId: superAdminRole.id,
                entityType: 'SNAP_RIDE_RIDE_SERVICE_TIERS'
            }
        });
        console.log('Found permissions:', existingPermissions.length);
        existingPermissions.forEach(perm => {
            console.log(`  - ${perm.permission}: ${perm.isGranted}`);
        });
        if (existingPermissions.length === 0) {
            console.log('\n❌ No permissions found for SNAP_RIDE_RIDE_SERVICE_TIERS');
            console.log('You need to run the SQL commands to add the permissions.');
        }
        else {
            console.log('\n✅ Permissions found for SNAP_RIDE_RIDE_SERVICE_TIERS');
        }
    }
    catch (error) {
        console.error('❌ Error checking permissions:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkRideServiceTiersPermission();
//# sourceMappingURL=checkRideServiceTiersPermission.js.map