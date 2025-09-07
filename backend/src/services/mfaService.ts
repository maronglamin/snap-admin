import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MFAService {
  // Generate TOTP secret and QR code
  static async generateMFASecret(adminId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `SNAP Admin Panel (${email})`,
      issuer: 'SNAP Marketplace',
      length: 32
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store secret and backup codes
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        mfaSecret: secret.base32,
        mfaBackupCodes: backupCodes,
        mfaEnabled: false,
        mfaVerified: false
      }
    });

    return {
      secret: secret.base32,
      qrCode,
      backupCodes
    };
  }

  // Verify TOTP token with enhanced debugging and flexibility
  static verifyTOTP(token: string, secret: string) {
    // Clean the token - remove any non-numeric characters
    const cleanToken = token.replace(/\D/g, '');
    
    // Validate token format
    if (cleanToken.length !== 6) {
      console.log(`MFA Debug: Invalid token length. Expected 6, got ${cleanToken.length}`);
      return false;
    }

    // Check if token is numeric
    if (!/^\d{6}$/.test(cleanToken)) {
      console.log(`MFA Debug: Token contains non-numeric characters: ${cleanToken}`);
      return false;
    }

    console.log(`MFA Debug: Verifying token: ${cleanToken} with secret: ${secret.substring(0, 8)}...`);

    try {
      // Try with different window sizes for better compatibility
      const result = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: cleanToken,
        window: 3, // Increased from 2 to 3 for better clock skew tolerance
        step: 30,  // Explicitly set 30-second step
        algorithm: 'sha1'
      });

      console.log(`MFA Debug: TOTP verification result: ${result}`);
      
      if (!result) {
        // Generate current valid tokens for debugging
        const currentToken = speakeasy.totp({
          secret,
          encoding: 'base32',
          step: 30,
          algorithm: 'sha1'
        });
        
        const previousToken = speakeasy.totp({
          secret,
          encoding: 'base32',
          step: 30,
          algorithm: 'sha1',
          time: Math.floor(Date.now() / 1000) - 30
        });
        
        const nextToken = speakeasy.totp({
          secret,
          encoding: 'base32',
          step: 30,
          algorithm: 'sha1',
          time: Math.floor(Date.now() / 1000) + 30
        });
        
        console.log(`MFA Debug: Current valid tokens - Previous: ${previousToken}, Current: ${currentToken}, Next: ${nextToken}`);
        console.log(`MFA Debug: Server time: ${new Date().toISOString()}`);
      }

      return result;
    } catch (error) {
      console.error('MFA Debug: TOTP verification error:', error);
      return false;
    }
  }

  // Alternative verification method with more debugging
  static verifyTOTPAlternative(token: string, secret: string) {
    const cleanToken = token.replace(/\D/g, '');
    
    if (cleanToken.length !== 6) {
      return false;
    }

    // Try multiple time windows
    const now = Math.floor(Date.now() / 1000);
    const step = 30;
    
    for (let i = -3; i <= 3; i++) {
      const time = now + (i * step);
      const expectedToken = speakeasy.totp({
        secret,
        encoding: 'base32',
        time,
        step,
        algorithm: 'sha1'
      });
      
      if (expectedToken === cleanToken) {
        console.log(`MFA Debug: Token matched at time offset ${i * step} seconds`);
        return true;
      }
    }
    
    return false;
  }

  // Verify backup code
  static async verifyBackupCode(adminId: string, backupCode: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    });

    if (!admin || !admin.mfaBackupCodes) {
      return false;
    }

    const isValid = admin.mfaBackupCodes.includes(backupCode);
    
    if (isValid) {
      // Remove used backup code
      const updatedCodes = admin.mfaBackupCodes.filter(code => code !== backupCode);
      await prisma.admin.update({
        where: { id: adminId },
        data: { mfaBackupCodes: updatedCodes }
      });
    }

    return isValid;
  }

  // Generate new backup codes
  static generateBackupCodes(count: number = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(this.generateRandomCode());
    }
    return codes;
  }

  private static generateRandomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Check if admin has MFA enabled
  static async isMFAEnabled(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { mfaEnabled: true }
    });
    return admin?.mfaEnabled || false;
  }

  // Get MFA secret for verification
  static async getMFASecret(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { mfaSecret: true }
    });
    return admin?.mfaSecret;
  }

  // Debug method to check MFA setup
  static async debugMFASetup(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        mfaEnabled: true,
        mfaSecret: true,
        mfaVerified: true,
        mfaBackupCodes: true
      }
    });

    if (!admin) {
      return { error: 'Admin not found' };
    }

    return {
      mfaEnabled: admin.mfaEnabled,
      mfaSecret: admin.mfaSecret ? `${admin.mfaSecret.substring(0, 8)}...` : null,
      mfaVerified: admin.mfaVerified,
      backupCodesCount: admin.mfaBackupCodes?.length || 0,
      serverTime: new Date().toISOString()
    };
  }
}
