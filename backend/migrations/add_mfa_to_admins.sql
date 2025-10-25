-- Add MFA fields to admins table
ALTER TABLE admins 
ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN mfa_secret TEXT,
ADD COLUMN mfa_backup_codes TEXT[],
ADD COLUMN mfa_verified BOOLEAN DEFAULT FALSE;

-- Create index for MFA verification
CREATE INDEX idx_admins_mfa_enabled ON admins(mfa_enabled);

-- Add comment for documentation
COMMENT ON COLUMN admins.mfa_enabled IS 'Whether MFA is enabled for this admin account';
COMMENT ON COLUMN admins.mfa_secret IS 'TOTP secret key for MFA authentication';
COMMENT ON COLUMN admins.mfa_backup_codes IS 'Array of backup codes for account recovery';
COMMENT ON COLUMN admins.mfa_verified IS 'Whether MFA has been verified and enabled';
