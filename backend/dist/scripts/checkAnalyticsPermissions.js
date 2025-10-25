"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkAnalyticsPermissions() {
    try {
        console.log('🔍 Checking ANALYTICS and ANALYTICS_REVENUE permissions...\n');
        const roles = await prisma.role.findMany({
            where: { isActive: true },
            include: {
                permissions: {
                    where: {
                        entityType: {
                            in: ['ANALYTICS', 'ANALYTICS_REVENUE']
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        console.log(`📋 Found ${roles.length} active roles:\n`);
        let totalAnalyticsPermissions = 0;
        let totalRevenuePermissions = 0;
        for (const role of roles) {
            const analyticsPermissions = role.permissions.filter(p => p.entityType === 'ANALYTICS');
            const revenuePermissions = role.permissions.filter(p => p.entityType === 'ANALYTICS_REVENUE');
            console.log(`👤 Role: ${role.name}`);
            console.log(`   Description: ${role.description}`);
            console.log(`   Active: ${role.isActive}`);
            if (analyticsPermissions.length > 0) {
                console.log(`   ✅ ANALYTICS permissions: ${analyticsPermissions.length}`);
                analyticsPermissions.forEach(perm => {
                    console.log(`      - ${perm.permission}: ${perm.isGranted ? '✅ Granted' : '❌ Denied'}`);
                });
                totalAnalyticsPermissions += analyticsPermissions.length;
            }
            else {
                console.log(`   ❌ ANALYTICS permissions: 0`);
            }
            if (revenuePermissions.length > 0) {
                console.log(`   ✅ ANALYTICS_REVENUE permissions: ${revenuePermissions.length}`);
                revenuePermissions.forEach(perm => {
                    console.log(`      - ${perm.permission}: ${perm.isGranted ? '✅ Granted' : '❌ Denied'}`);
                });
                totalRevenuePermissions += revenuePermissions.length;
            }
            else {
                console.log(`   ❌ ANALYTICS_REVENUE permissions: 0`);
            }
            console.log('');
        }
        console.log(`📊 Summary:`);
        console.log(`   Total ANALYTICS permissions: ${totalAnalyticsPermissions}`);
        console.log(`   Total ANALYTICS_REVENUE permissions: ${totalRevenuePermissions}`);
        console.log(`   Total Analytics-related permissions: ${totalAnalyticsPermissions + totalRevenuePermissions}`);
    }
    catch (error) {
        console.error('❌ Error checking analytics permissions:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkAnalyticsPermissions();
//# sourceMappingURL=checkAnalyticsPermissions.js.map