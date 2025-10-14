import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Ensuring Super Admin and admin user exist...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@snap.com';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminName = process.env.ADMIN_NAME || 'Admin User';
  const adminPasswordPlain = process.env.ADMIN_PASSWORD || 'admin123';

  // 1) Ensure Super Admin role exists
  let superAdminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        isActive: true,
      },
    });
    console.log('✅ Created role: Super Admin');
  } else {
    console.log('ℹ️ Role already exists: Super Admin');
  }

  // 2) Ensure System Administration operator entity exists (associated to Super Admin role)
  let systemAdminEntity = await prisma.operatorEntity.findFirst({
    where: { name: 'System Administration', roleId: superAdminRole.id },
  });

  if (!systemAdminEntity) {
    systemAdminEntity = await prisma.operatorEntity.create({
      data: {
        name: 'System Administration',
        description: 'Core system administration and configuration team',
        roleId: superAdminRole.id,
        isActive: true,
      },
    });
    console.log('✅ Created operator entity: System Administration');
  } else {
    console.log('ℹ️ Operator entity already exists: System Administration');
  }

  // 3) Ensure admin user exists (by unique email)
  const hashedPassword = await bcrypt.hash(adminPasswordPlain, 12);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {
      // Keep existing password if present; only update metadata and entity assignment
      name: adminName,
      username: adminUsername,
      operatorEntityId: systemAdminEntity.id,
      isActive: true,
    },
    create: {
      email: adminEmail,
      username: adminUsername,
      password: hashedPassword,
      name: adminName,
      isActive: true,
      operatorEntityId: systemAdminEntity.id,
    },
  });

  console.log('✅ Admin user ensured:', admin.email);
  console.log('✅ Admin username:', admin.username);
  console.log('✅ Admin assigned to entity:', systemAdminEntity.name);
  console.log('🎉 Done');
}

main()
  .catch((e) => {
    console.error('❌ Error ensuring admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


