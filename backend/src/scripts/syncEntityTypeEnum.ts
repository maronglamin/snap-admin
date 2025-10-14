import { PrismaClient, EntityType as PrismaEntityType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shouldApply = process.argv.includes('--apply');

  const expectedEntityTypes = Object.values(PrismaEntityType);
  console.log('Expected EntityType values from Prisma schema:', expectedEntityTypes);

  const rows = await prisma.$queryRaw<Array<{ enum_value: string }>>`
    SELECT unnest(enum_range(NULL::"EntityType")) as enum_value;
  `;
  const actualEntityTypes = rows.map(r => r.enum_value);
  console.log('Current EntityType values in database:', actualEntityTypes);

  const actualSet = new Set(actualEntityTypes);
  const missing = expectedEntityTypes.filter(v => !actualSet.has(v));

  if (missing.length === 0) {
    console.log('✅ EntityType enum is up-to-date. No action needed.');
    return;
  }

  console.log('⚠️  Missing EntityType values in database:', missing);

  if (!shouldApply) {
    console.log('\nRun with --apply to add the missing values:');
    for (const value of missing) {
      console.log(`ALTER TYPE "public"."EntityType" ADD VALUE '${value}';`);
    }
    return;
  }

  for (const value of missing) {
    if (!/^[A-Z_]+$/.test(value)) {
      throw new Error(`Unsafe enum value detected: ${value}`);
    }
    const sql = `ALTER TYPE "public"."EntityType" ADD VALUE '${value}';`;
    console.log('Applying:', sql);
    await prisma.$executeRawUnsafe(sql);
  }

  const rowsAfter = await prisma.$queryRaw<Array<{ enum_value: string }>>`
    SELECT unnest(enum_range(NULL::"EntityType")) as enum_value;
  `;
  console.log('EntityType values after apply:', rowsAfter.map(r => r.enum_value));
  console.log('✅ Done.');
}

main()
  .catch((e) => {
    console.error('syncEntityTypeEnum failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


