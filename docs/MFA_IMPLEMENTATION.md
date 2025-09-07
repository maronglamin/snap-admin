# Multi-Factor Authentication (MFA) Implementation

## Overview

This document describes the implementation of Multi-Factor Authentication (MFA) for the SNAP Admin Panel. The system uses Time-based One-Time Password (TOTP) authentication, which is compatible with popular authenticator apps like Google Authenticator, Authy, and Microsoft Authenticator.

## Features

- **TOTP-based MFA**: Uses industry-standard TOTP algorithm
- **QR Code Generation**: Easy setup with QR code scanning
- **Backup Codes**: 8 one-time use backup codes for account recovery
- **Automatic MFA Setup**: First-time login automatically triggers MFA setup
- **Secure Storage**: MFA secrets are stored securely in the database
- **Fallback Authentication**: Backup codes provide account recovery options

## Architecture

### Backend Components

1. **MFA Service** (`backend/src/services/mfaService.ts`)
   - Handles TOTP secret generation
   - Verifies TOTP tokens
   - Manages backup codes
   - Provides MFA status checks

2. **Updated Auth Routes** (`backend/src/routes/auth.ts`)
   - Modified login flow to require MFA
   - New endpoints for MFA verification
   - Backup code verification
   - MFA setup and enablement

3. **Database Schema** (`backend/prisma/schema.prisma`)
   - Added MFA fields to Admin model
   - Secure storage of TOTP secrets
   - Backup codes array storage

### Frontend Components

1. **MFA Setup** (`admin-panel/src/components/auth/MFASetup.tsx`)
   - First-time MFA configuration
   - QR code display
   - Manual secret entry
   - Backup codes display

2. **MFA Verification** (`admin-panel/src/components/auth/MFAVerification.tsx`)
   - TOTP code entry
   - Backup code fallback
   - Error handling and validation

3. **Updated Login Flow** (`admin-panel/src/components/auth/Login.tsx`)
   - Handles MFA states
   - Conditional rendering based on MFA requirements

4. **Auth Store** (`admin-panel/src/stores/authStore.ts`)
   - MFA state management
   - API integration for MFA operations

## Database Schema

```sql
-- MFA fields added to admins table
ALTER TABLE admins 
ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN mfa_secret TEXT,
ADD COLUMN mfa_backup_codes TEXT[],
ADD COLUMN mfa_verified BOOLEAN DEFAULT FALSE;
```

### Field Descriptions

- `mfa_enabled`: Whether MFA is active for the account
- `mfa_secret`: Base32-encoded TOTP secret key
- `mfa_backup_codes`: Array of one-time use backup codes
- `mfa_verified`: Whether MFA has been verified and enabled

## API Endpoints

### Authentication Flow

1. **POST /api/auth/login**
   - Username/password authentication
   - Returns MFA requirement status
   - Triggers MFA setup for first-time users

2. **POST /api/auth/verify-mfa**
   - Verifies TOTP token for existing users
   - Completes login process
   - Returns JWT token and user data

3. **POST /api/auth/enable-mfa**
   - Enables MFA after first-time setup
   - Verifies TOTP token before activation

4. **POST /api/auth/verify-backup-code**
   - Account recovery using backup codes
   - One-time use per code
   - Completes login process

## User Experience Flow

### First-Time Login

1. User enters username/password
2. System validates credentials
3. MFA setup is automatically initiated
4. User scans QR code with authenticator app
5. User enters 6-digit code to verify setup
6. MFA is enabled and user is logged in
7. Backup codes are displayed for safekeeping

### Subsequent Logins

1. User enters username/password
2. System validates credentials
3. MFA verification is required
4. User enters 6-digit code from authenticator app
5. Upon successful verification, user is logged in

### Account Recovery

1. User can use backup codes instead of TOTP
2. Each backup code can only be used once
3. Used codes are automatically removed from the system
4. New backup codes can be generated if needed

## Security Features

### TOTP Implementation

- **Algorithm**: HMAC-SHA1 (industry standard)
- **Time Window**: 30-second intervals
- **Clock Skew Tolerance**: ±2 time steps (60 seconds)
- **Secret Length**: 32 characters (Base32 encoded)

### Backup Code Security

- **Format**: 6-character alphanumeric codes
- **Quantity**: 8 codes per user
- **Usage**: One-time use only
- **Storage**: Encrypted in database

### Rate Limiting

- MFA verification endpoints are rate-limited
- Prevents brute force attacks
- Configurable limits per endpoint

## Dependencies

### Backend

```json
{
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.0"
}
```

### Frontend

- No additional dependencies required
- Uses existing React and Zustand setup

## Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

### MFA Settings

- **TOTP Interval**: 30 seconds (configurable)
- **Secret Length**: 32 characters
- **Backup Codes**: 8 codes per user
- **Clock Skew**: ±2 time steps

## Testing

### Backend Testing

Run the MFA test script:

```bash
cd backend
npm run build
npx ts-node src/scripts/testMFA.ts
```

### Frontend Testing

1. Start the development server
2. Attempt login with existing credentials
3. Verify MFA flow works correctly
4. Test backup code functionality

## Deployment

### Database Migration

1. Run the migration script:
   ```bash
   cd backend
   npm run db:push
   ```

2. Verify schema changes:
   ```bash
   npm run db:studio
   ```

### Build and Deploy

1. Build backend:
   ```bash
   cd backend
   npm run build
   ```

2. Build frontend:
   ```bash
   cd admin-panel
   npm run build
   ```

## Monitoring and Maintenance

### Logs

- MFA setup attempts
- Verification failures
- Backup code usage
- Account lockouts

### Maintenance Tasks

- Regular backup code rotation
- Monitor failed MFA attempts
- Update authenticator app recommendations
- Security audit reviews

## Troubleshooting

### Common Issues

1. **Clock Skew**: Ensure server time is synchronized
2. **QR Code Issues**: Verify authenticator app compatibility
3. **Backup Code Problems**: Check database connectivity
4. **Rate Limiting**: Monitor API usage patterns

### Support

- Check application logs for detailed error messages
- Verify database schema matches expected structure
- Test MFA endpoints independently
- Review authenticator app compatibility

## Future Enhancements

### Planned Features

- **SMS MFA**: Alternative authentication method
- **Hardware Tokens**: FIDO2/U2F support
- **MFA Management**: Admin controls for MFA policies
- **Audit Logging**: Enhanced security event tracking

### Security Improvements

- **Biometric Authentication**: Fingerprint/face recognition
- **Risk-Based Authentication**: Adaptive MFA requirements
- **Device Management**: Trusted device registration
- **Advanced Encryption**: Enhanced secret storage

## Compliance

This MFA implementation complies with:

- **NIST SP 800-63B**: Digital Identity Guidelines
- **ISO 27001**: Information Security Management
- **GDPR**: Data Protection Requirements
- **SOC 2**: Security Controls Framework

## Support and Documentation

For additional support or questions about the MFA implementation:

1. Review this documentation
2. Check the code comments
3. Run the test scripts
4. Contact the development team

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: SNAP Development Team
