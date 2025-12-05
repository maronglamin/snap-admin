"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const entityTypes = [
    'DASHBOARD',
    'USERS',
    'USERS_SNAP_USERS',
    'USERS_KYC_APPROVAL',
    'PRODUCTS',
    'PRODUCTS_CATEGORIES',
    'ORDERS',
    'SETTLEMENTS',
    'SETTLEMENTS_REQUESTS',
    'SETTLEMENTS_SHEET',
    'SETTLEMENTS_CUMULATIVE_ENTRIES',
    'JOURNALS',
    'JOURNALS_STRIPE_PAYMENT_REPORT',
    'JOURNALS_SNAP_FEE_REPORT',
    'JOURNALS_AUDIT_REPORT',
    'SYSTEM_CONFIG',
    'SYSTEM_CONFIG_ROLES',
    'SYSTEM_CONFIG_OPERATOR_ENTITY',
    'SYSTEM_CONFIG_SYSTEM_OPERATOR',
    'SYSTEM_CONFIG_SETTLEMENT_GROUP',
    'SYSTEM_CONFIG_PAYMENT_GATEWAYS',
    'SNAP_RIDE',
    'SNAP_RIDE_RIDER_APPLICATIONS',
    'SNAP_RIDE_DRIVER_MANAGEMENT',
    'SNAP_RIDE_RIDE_MANAGEMENT',
    'SNAP_RIDE_ANALYTICS',
    'SNAP_RIDE_RIDE_SERVICE',
    'ANALYTICS',
    'ANALYTICS_REVENUE',
    'AUTHENTICATION',
    'AUTHENTICATION_DEVICE_AUTHENTICATION'
];
const permissions = ['VIEW', 'ADD', 'EDIT', 'DELETE', 'EXPORT'];
async function seedRoles() {
    try {
        console.log('🌱 Starting role seeding...');
        const superAdminRole = await prisma.role.upsert({
            where: { name: 'Super Admin' },
            update: {},
            create: {
                name: 'Super Admin',
                description: 'Full access to all features and system configuration',
                isActive: true,
            },
        });
        const superAdminPermissions = [];
        for (const entityType of entityTypes) {
            for (const permission of permissions) {
                superAdminPermissions.push({
                    roleId: superAdminRole.id,
                    entityType: entityType,
                    permission: permission,
                    isGranted: true,
                });
            }
        }
        await prisma.rolePermission.createMany({
            data: superAdminPermissions,
            skipDuplicates: true,
        });
        console.log('✅ Super Admin role created with all permissions');
        const managerRole = await prisma.role.upsert({
            where: { name: 'Manager' },
            update: {},
            create: {
                name: 'Manager',
                description: 'Can view and manage users, products, orders, and settlements',
                isActive: true,
            },
        });
        const managerPermissions = [];
        const managerEntityTypes = [
            'DASHBOARD', 'USERS', 'PRODUCTS', 'ORDERS', 'SETTLEMENTS', 'JOURNALS', 'SNAP_RIDE', 'AUTHENTICATION',
            'USERS_SNAP_USERS', 'USERS_KYC_APPROVAL',
            'PRODUCTS_CATEGORIES',
            'SETTLEMENTS_REQUESTS', 'SETTLEMENTS_SHEET', 'SETTLEMENTS_CUMULATIVE_ENTRIES',
            'JOURNALS_STRIPE_PAYMENT_REPORT', 'JOURNALS_SNAP_FEE_REPORT', 'JOURNALS_AUDIT_REPORT',
            'SNAP_RIDE_RIDER_APPLICATIONS', 'SNAP_RIDE_DRIVER_MANAGEMENT', 'SNAP_RIDE_RIDE_MANAGEMENT', 'SNAP_RIDE_ANALYTICS',
            'ANALYTICS',
            'ANALYTICS_REVENUE',
            'AUTHENTICATION_DEVICE_AUTHENTICATION',
        ];
        for (const entityType of managerEntityTypes) {
            for (const permission of permissions) {
                managerPermissions.push({
                    roleId: managerRole.id,
                    entityType: entityType,
                    permission: permission,
                    isGranted: true,
                });
            }
        }
        await prisma.rolePermission.createMany({
            data: managerPermissions,
            skipDuplicates: true,
        });
        console.log('✅ Manager role created with limited permissions');
        const viewerRole = await prisma.role.upsert({
            where: { name: 'Viewer' },
            update: {},
            create: {
                name: 'Viewer',
                description: 'Read-only access to view data',
                isActive: true,
            },
        });
        const viewerPermissions = [];
        for (const entityType of entityTypes) {
            viewerPermissions.push({
                roleId: viewerRole.id,
                entityType: entityType,
                permission: 'VIEW',
                isGranted: true,
            });
        }
        await prisma.rolePermission.createMany({
            data: viewerPermissions,
            skipDuplicates: true,
        });
        console.log('✅ Viewer role created with read-only permissions');
        const supportRole = await prisma.role.upsert({
            where: { name: 'Support' },
            update: {},
            create: {
                name: 'Support',
                description: 'Can view and manage users, view other data',
                isActive: true,
            },
        });
        const supportPermissions = [];
        const userEntities = ['USERS', 'USERS_SNAP_USERS', 'USERS_KYC_APPROVAL'];
        for (const entityType of userEntities) {
            for (const permission of permissions) {
                supportPermissions.push({
                    roleId: supportRole.id,
                    entityType: entityType,
                    permission: permission,
                    isGranted: true,
                });
            }
        }
        const viewOnlyMainEntities = ['DASHBOARD', 'PRODUCTS', 'ORDERS', 'SETTLEMENTS', 'JOURNALS', 'SNAP_RIDE', 'AUTHENTICATION'];
        const viewOnlySubEntities = [
            'PRODUCTS_CATEGORIES',
            'SETTLEMENTS_REQUESTS', 'SETTLEMENTS_SHEET', 'SETTLEMENTS_CUMULATIVE_ENTRIES',
            'JOURNALS_STRIPE_PAYMENT_REPORT', 'JOURNALS_SNAP_FEE_REPORT', 'JOURNALS_AUDIT_REPORT',
            'SNAP_RIDE_RIDER_APPLICATIONS', 'SNAP_RIDE_DRIVER_MANAGEMENT', 'SNAP_RIDE_RIDE_MANAGEMENT', 'SNAP_RIDE_ANALYTICS',
            'AUTHENTICATION_DEVICE_AUTHENTICATION',
        ];
        for (const entityType of [...viewOnlyMainEntities, ...viewOnlySubEntities]) {
            supportPermissions.push({
                roleId: supportRole.id,
                entityType: entityType,
                permission: 'VIEW',
                isGranted: true,
            });
        }
        await prisma.rolePermission.createMany({
            data: supportPermissions,
            skipDuplicates: true,
        });
        console.log('✅ Support role created with user management permissions');
        console.log('🎉 Role seeding completed successfully!');
        console.log('\n📋 Created roles:');
        console.log('- Super Admin: Full access to all features');
        console.log('- Manager: Can manage users, products, orders, settlements, journals');
        console.log('- Viewer: Read-only access to all data');
        console.log('- Support: Can manage users, view other data');
    }
    catch (error) {
        console.error('❌ Error seeding roles:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
seedRoles();
//# sourceMappingURL=seedRoles.js.map