-- Add SNAP_RIDE_RIDE_SERVICE_TIERS to EntityType enum
ALTER TYPE "public"."EntityType" ADD VALUE 'SNAP_RIDE_RIDE_SERVICE_TIERS';

-- Add permissions to Super Admin role for SNAP_RIDE_RIDE_SERVICE_TIERS
INSERT INTO "public"."role_permissions" ("id", "roleId", "entityType", "permission", "isGranted", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid() as "id",
  r.id as "roleId",
  'SNAP_RIDE_RIDE_SERVICE_TIERS'::"EntityType" as "entityType",
  p.permission::"Permission" as "permission",
  true as "isGranted",
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM "public"."roles" r
CROSS JOIN (
  SELECT 'VIEW' as permission
  UNION ALL SELECT 'ADD'
  UNION ALL SELECT 'EDIT'
  UNION ALL SELECT 'DELETE'
  UNION ALL SELECT 'EXPORT'
) p
WHERE r.name = 'Super Admin'
ON CONFLICT ("roleId", "entityType", "permission") DO UPDATE SET
  "isGranted" = EXCLUDED."isGranted",
  "updatedAt" = NOW();
