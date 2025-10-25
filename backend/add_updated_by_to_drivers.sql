-- Add updatedBy column to drivers table
ALTER TABLE drivers ADD COLUMN "updatedBy" TEXT;

-- Add comment to the column
COMMENT ON COLUMN drivers."updatedBy" IS 'Admin username who last updated the record';
