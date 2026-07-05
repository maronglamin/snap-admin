import { PrismaClient, EntityType, Permission } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const ALL_ENTITY_TYPES: EntityType[] = [
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
  'ECOMMERCE',
  'ECOMMERCE_SALES_OUTLETS',
  'ECOMMERCE_BRANCH_DETAILS',
  'ECOMMERCE_PRINCIPAL_BUSINESS',
  'SNAP_RIDE',
  'SNAP_RIDE_RIDER_APPLICATIONS',
  'SNAP_RIDE_DRIVER_MANAGEMENT',
  'SNAP_RIDE_RIDE_MANAGEMENT',
  'SNAP_RIDE_ANALYTICS',
  'SNAP_RIDE_RIDE_SERVICE',
  'SNAP_RIDE_RIDE_SERVICE_TIERS',
  'SNAP_RENTAL',
  'SNAP_RENTAL_REQUEST',
  'SNAP_HOME_SERVICES',
  'SNAP_HOME_SERVICES_PROVIDER_APPLICATIONS',
  'SNAP_HOME_SERVICES_PROVIDERS',
  'SNAP_HOME_SERVICES_BOOKINGS',
  'SNAP_HOME_SERVICES_CATEGORIES',
  'SNAP_REAL_ESTATE',
  'SNAP_REAL_ESTATE_AGENT_APPLICATIONS',
  'SNAP_REAL_ESTATE_AGENTS',
  'SNAP_REAL_ESTATE_LISTINGS',
  'SNAP_REAL_ESTATE_BOOKINGS',
  'ANALYTICS',
  'ANALYTICS_REVENUE',
  'AUTHENTICATION',
  'AUTHENTICATION_DEVICE_AUTHENTICATION',
];

const ALL_PERMISSIONS: Permission[] = ['VIEW', 'ADD', 'EDIT', 'DELETE', 'EXPORT'];

async function ensureRolePermissions(
  roleId: string,
  entries: Array<{ entityType: EntityType; permission: Permission }>
) {
  for (const entry of entries) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_entityType_permission: {
          roleId,
          entityType: entry.entityType,
          permission: entry.permission,
        },
      },
      update: { isGranted: true },
      create: {
        roleId,
        entityType: entry.entityType,
        permission: entry.permission,
        isGranted: true,
      },
    });
  }
}

async function ensureOperatorEntity(name: string, description: string, roleId: string) {
  const existing = await prisma.operatorEntity.findFirst({
    where: { name, roleId },
  });

  if (existing) {
    return existing;
  }

  return prisma.operatorEntity.create({
    data: { name, description, roleId, isActive: true },
  });
}

async function main() {
  console.log('🌱 Starting database seeding...');

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: { isActive: true },
    create: {
      name: 'Super Admin',
      description: 'Full system access with all permissions',
      isActive: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: { isActive: true },
    create: {
      name: 'Manager',
      description: 'Limited administrative access',
      isActive: true,
    },
  });

  const supportRole = await prisma.role.upsert({
    where: { name: 'Support' },
    update: { isActive: true },
    create: {
      name: 'Support',
      description: 'Customer support and basic operations',
      isActive: true,
    },
  });

  console.log('✅ Roles ensured:', [superAdminRole.name, managerRole.name, supportRole.name]);

  const superAdminPermissions = ALL_ENTITY_TYPES.flatMap((entityType) =>
    ALL_PERMISSIONS.map((permission) => ({ entityType, permission }))
  );
  await ensureRolePermissions(superAdminRole.id, superAdminPermissions);
  console.log(`✅ Super Admin permissions ensured (${superAdminPermissions.length})`);

  const managerEntityTypes: EntityType[] = [
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
    'SNAP_RIDE',
    'SNAP_RIDE_RIDER_APPLICATIONS',
    'SNAP_RIDE_DRIVER_MANAGEMENT',
    'SNAP_RIDE_RIDE_MANAGEMENT',
    'SNAP_RIDE_ANALYTICS',
    'SNAP_RIDE_RIDE_SERVICE',
    'SNAP_RIDE_RIDE_SERVICE_TIERS',
    'ECOMMERCE',
    'ECOMMERCE_SALES_OUTLETS',
    'ECOMMERCE_BRANCH_DETAILS',
    'ECOMMERCE_PRINCIPAL_BUSINESS',
    'SNAP_RENTAL',
    'SNAP_RENTAL_REQUEST',
    'SNAP_HOME_SERVICES',
    'SNAP_HOME_SERVICES_PROVIDER_APPLICATIONS',
    'SNAP_HOME_SERVICES_PROVIDERS',
    'SNAP_HOME_SERVICES_BOOKINGS',
    'SNAP_HOME_SERVICES_CATEGORIES',
    'SNAP_REAL_ESTATE',
    'SNAP_REAL_ESTATE_AGENT_APPLICATIONS',
    'SNAP_REAL_ESTATE_AGENTS',
    'SNAP_REAL_ESTATE_LISTINGS',
    'SNAP_REAL_ESTATE_BOOKINGS',
    'ANALYTICS',
    'ANALYTICS_REVENUE',
    'AUTHENTICATION',
    'AUTHENTICATION_DEVICE_AUTHENTICATION',
  ];
  const managerPermissions = managerEntityTypes.flatMap((entityType) =>
    ALL_PERMISSIONS.map((permission) => ({ entityType, permission }))
  );
  await ensureRolePermissions(managerRole.id, managerPermissions);
  console.log(`✅ Manager permissions ensured (${managerPermissions.length})`);

  const supportPermissions = [
    ...['USERS', 'USERS_SNAP_USERS', 'USERS_KYC_APPROVAL'].flatMap((entityType) =>
      ALL_PERMISSIONS.map((permission) => ({ entityType: entityType as EntityType, permission }))
    ),
    ...[
      'DASHBOARD',
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
      'SNAP_RIDE',
      'SNAP_RIDE_RIDER_APPLICATIONS',
      'SNAP_RIDE_DRIVER_MANAGEMENT',
      'SNAP_RIDE_RIDE_MANAGEMENT',
      'SNAP_RIDE_ANALYTICS',
      'ECOMMERCE',
      'ECOMMERCE_SALES_OUTLETS',
      'SNAP_RENTAL',
      'SNAP_RENTAL_REQUEST',
      'SNAP_HOME_SERVICES',
      'SNAP_HOME_SERVICES_PROVIDER_APPLICATIONS',
      'SNAP_HOME_SERVICES_PROVIDERS',
      'SNAP_HOME_SERVICES_BOOKINGS',
      'SNAP_HOME_SERVICES_CATEGORIES',
      'SNAP_REAL_ESTATE',
      'SNAP_REAL_ESTATE_AGENT_APPLICATIONS',
      'SNAP_REAL_ESTATE_AGENTS',
      'SNAP_REAL_ESTATE_LISTINGS',
      'SNAP_REAL_ESTATE_BOOKINGS',
      'ANALYTICS',
      'ANALYTICS_REVENUE',
      'AUTHENTICATION',
      'AUTHENTICATION_DEVICE_AUTHENTICATION',
    ].map((entityType) => ({ entityType: entityType as EntityType, permission: 'VIEW' as Permission })),
  ];
  await ensureRolePermissions(supportRole.id, supportPermissions);
  console.log(`✅ Support permissions ensured (${supportPermissions.length})`);

  const systemAdminEntity = await ensureOperatorEntity(
    'System Administration',
    'Core system administration and configuration team',
    superAdminRole.id
  );
  const productManagementEntity = await ensureOperatorEntity(
    'Product Management',
    'Team responsible for product catalog and inventory management',
    managerRole.id
  );
  const customerSupportEntity = await ensureOperatorEntity(
    'Customer Support Team',
    'Team responsible for customer support and issue resolution',
    supportRole.id
  );

  console.log('✅ Operator entities ensured:', [
    systemAdminEntity.name,
    productManagementEntity.name,
    customerSupportEntity.name,
  ]);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@snap.com';
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {
      name: process.env.ADMIN_NAME || 'Admin User',
      username: process.env.ADMIN_USERNAME || 'admin',
      operatorEntityId: systemAdminEntity.id,
      isActive: true,
    },
    create: {
      email: adminEmail,
      username: process.env.ADMIN_USERNAME || 'admin',
      password: adminPassword,
      name: process.env.ADMIN_NAME || 'Admin User',
      isActive: true,
      operatorEntityId: systemAdminEntity.id,
    },
  });

  console.log('✅ Admin user ensured:', admin.email);
  console.log('✅ Admin username:', admin.username);
  console.log('✅ Admin assigned to entity:', systemAdminEntity.name);
  console.log('✅ Admin role:', superAdminRole.name);

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📋 Admin credentials:');
  console.log(`Email: ${adminEmail}`);
  console.log(`Username: ${admin.username}`);
  console.log(`Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
