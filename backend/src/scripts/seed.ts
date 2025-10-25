import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Full system access with all permissions',
      isActive: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      description: 'Limited administrative access',
      isActive: true,
    },
  });

  const supportRole = await prisma.role.upsert({
    where: { name: 'Support' },
    update: {},
    create: {
      name: 'Support',
      description: 'Customer support and basic operations',
      isActive: true,
    },
  });

  console.log('✅ Roles created:', [superAdminRole.name, managerRole.name, supportRole.name]);

  // Create permissions for Super Admin role
  const superAdminPermissions = [
    { entityType: 'USERS', permission: 'ADD' },
    { entityType: 'USERS', permission: 'EDIT' },
    { entityType: 'USERS', permission: 'VIEW' },
    { entityType: 'USERS', permission: 'DELETE' },
    { entityType: 'PRODUCTS', permission: 'ADD' },
    { entityType: 'PRODUCTS', permission: 'EDIT' },
    { entityType: 'PRODUCTS', permission: 'VIEW' },
    { entityType: 'PRODUCTS', permission: 'DELETE' },
    { entityType: 'ORDERS', permission: 'ADD' },
    { entityType: 'ORDERS', permission: 'EDIT' },
    { entityType: 'ORDERS', permission: 'VIEW' },
    { entityType: 'ORDERS', permission: 'DELETE' },
    { entityType: 'SETTLEMENTS', permission: 'ADD' },
    { entityType: 'SETTLEMENTS', permission: 'EDIT' },
    { entityType: 'SETTLEMENTS', permission: 'VIEW' },
    { entityType: 'SETTLEMENTS', permission: 'DELETE' },
    { entityType: 'ANALYTICS', permission: 'ADD' },
    { entityType: 'ANALYTICS', permission: 'EDIT' },
    { entityType: 'ANALYTICS', permission: 'VIEW' },
    { entityType: 'ANALYTICS', permission: 'DELETE' },
    { entityType: 'SYSTEM_CONFIG', permission: 'ADD' },
    { entityType: 'SYSTEM_CONFIG', permission: 'EDIT' },
    { entityType: 'SYSTEM_CONFIG', permission: 'VIEW' },
    { entityType: 'SYSTEM_CONFIG', permission: 'DELETE' },
  ];

  for (const perm of superAdminPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_entityType_permission: {
          roleId: superAdminRole.id,
          entityType: perm.entityType as any,
          permission: perm.permission as any,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        entityType: perm.entityType as any,
        permission: perm.permission as any,
        isGranted: true,
      },
    });
  }

  // Create permissions for Manager role
  const managerPermissions = [
    { entityType: 'USERS', permission: 'EDIT' },
    { entityType: 'USERS', permission: 'VIEW' },
    { entityType: 'PRODUCTS', permission: 'ADD' },
    { entityType: 'PRODUCTS', permission: 'EDIT' },
    { entityType: 'PRODUCTS', permission: 'VIEW' },
    { entityType: 'ORDERS', permission: 'EDIT' },
    { entityType: 'ORDERS', permission: 'VIEW' },
    { entityType: 'SETTLEMENTS', permission: 'VIEW' },
    { entityType: 'ANALYTICS', permission: 'VIEW' },
  ];

  for (const perm of managerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_entityType_permission: {
          roleId: managerRole.id,
          entityType: perm.entityType as any,
          permission: perm.permission as any,
        },
      },
      update: {},
      create: {
        roleId: managerRole.id,
        entityType: perm.entityType as any,
        permission: perm.permission as any,
        isGranted: true,
      },
    });
  }

  // Create permissions for Support role
  const supportPermissions = [
    { entityType: 'USERS', permission: 'VIEW' },
    { entityType: 'PRODUCTS', permission: 'VIEW' },
    { entityType: 'ORDERS', permission: 'EDIT' },
    { entityType: 'ORDERS', permission: 'VIEW' },
    { entityType: 'SETTLEMENTS', permission: 'VIEW' },
    { entityType: 'ANALYTICS', permission: 'VIEW' },
  ];

  for (const perm of supportPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_entityType_permission: {
          roleId: supportRole.id,
          entityType: perm.entityType as any,
          permission: perm.permission as any,
        },
      },
      update: {},
      create: {
        roleId: supportRole.id,
        entityType: perm.entityType as any,
        permission: perm.permission as any,
        isGranted: true,
      },
    });
  }

  console.log('✅ Role permissions created');

  // Create operator entities
  const systemAdminEntity = await prisma.operatorEntity.create({
    data: {
      name: 'System Administration',
      description: 'Core system administration and configuration team',
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  const productManagementEntity = await prisma.operatorEntity.create({
    data: {
      name: 'Product Management',
      description: 'Team responsible for product catalog and inventory management',
      roleId: managerRole.id,
      isActive: true,
    },
  });

  const customerSupportEntity = await prisma.operatorEntity.create({
    data: {
      name: 'Customer Support Team',
      description: 'Team responsible for customer support and issue resolution',
      roleId: supportRole.id,
      isActive: true,
    },
  });

  console.log('✅ Operator entities created:', [
    systemAdminEntity.name,
    productManagementEntity.name,
    customerSupportEntity.name
  ]);

  // Create admin user
  const adminPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || 'admin123',
    12
  );

  const admin = await prisma.admin.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@snap.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@snap.com',
      username: 'admin',
      password: adminPassword,
      name: process.env.ADMIN_NAME || 'Admin User',
      isActive: true,
      operatorEntityId: systemAdminEntity.id,
    },
  });

  console.log('✅ Admin user created:', admin.email);
  console.log('✅ Admin username:', admin.username);
  console.log('✅ Admin assigned to entity:', systemAdminEntity.name);

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📋 Admin credentials:');
  console.log('Email: admin@snap.com');
  console.log('Username: admin');
  console.log('Password: admin123');
  console.log('');
  console.log('📋 Created Roles:');
  console.log('- Super Admin (Full access)');
  console.log('- Manager (Limited access)');
  console.log('- Support (Basic access)');
  console.log('');
  console.log('📋 Created Operator Entities:');
  console.log('- System Administration (Super Admin role)');
  console.log('- Product Management (Manager role)');
  console.log('- Customer Support Team (Support role)');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 