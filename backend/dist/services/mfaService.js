"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MFAService = void 0;
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class MFAService {
    static async generateMFASecret(adminId, email) {
        const secret = speakeasy_1.default.generateSecret({
            name: `SNAP Admin Panel (${email})`,
            issuer: 'SNAP Marketplace',
            length: 32
        });
        const qrCode = await qrcode_1.default.toDataURL(secret.otpauth_url);
        const backupCodes = this.generateBackupCodes();
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
    static verifyTOTP(token, secret) {
        const cleanToken = token.replace(/\D/g, '');
        if (cleanToken.length !== 6) {
            console.log(`MFA Debug: Invalid token length. Expected 6, got ${cleanToken.length}`);
            return false;
        }
        if (!/^\d{6}$/.test(cleanToken)) {
            console.log(`MFA Debug: Token contains non-numeric characters: ${cleanToken}`);
            return false;
        }
        console.log(`MFA Debug: Verifying token: ${cleanToken} with secret: ${secret.substring(0, 8)}...`);
        try {
            const result = speakeasy_1.default.totp.verify({
                secret,
                encoding: 'base32',
                token: cleanToken,
                window: 3,
                step: 30,
                algorithm: 'sha1'
            });
            console.log(`MFA Debug: TOTP verification result: ${result}`);
            if (!result) {
                const currentToken = speakeasy_1.default.totp({
                    secret,
                    encoding: 'base32',
                    step: 30,
                    algorithm: 'sha1'
                });
                const previousToken = speakeasy_1.default.totp({
                    secret,
                    encoding: 'base32',
                    step: 30,
                    algorithm: 'sha1',
                    time: Math.floor(Date.now() / 1000) - 30
                });
                const nextToken = speakeasy_1.default.totp({
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
        }
        catch (error) {
            console.error('MFA Debug: TOTP verification error:', error);
            return false;
        }
    }
    static verifyTOTPAlternative(token, secret) {
        const cleanToken = token.replace(/\D/g, '');
        if (cleanToken.length !== 6) {
            return false;
        }
        const now = Math.floor(Date.now() / 1000);
        const step = 30;
        for (let i = -3; i <= 3; i++) {
            const time = now + (i * step);
            const expectedToken = speakeasy_1.default.totp({
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
    static async verifyBackupCode(adminId, backupCode) {
        const admin = await prisma.admin.findUnique({
            where: { id: adminId }
        });
        if (!admin || !admin.mfaBackupCodes) {
            return false;
        }
        const isValid = admin.mfaBackupCodes.includes(backupCode);
        if (isValid) {
            const updatedCodes = admin.mfaBackupCodes.filter(code => code !== backupCode);
            await prisma.admin.update({
                where: { id: adminId },
                data: { mfaBackupCodes: updatedCodes }
            });
        }
        return isValid;
    }
    static generateBackupCodes(count = 8) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            codes.push(this.generateRandomCode());
        }
        return codes;
    }
    static generateRandomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    static async isMFAEnabled(adminId) {
        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            select: { mfaEnabled: true }
        });
        return admin?.mfaEnabled || false;
    }
    static async getMFASecret(adminId) {
        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            select: { mfaSecret: true }
        });
        return admin?.mfaSecret;
    }
    static async debugMFASetup(adminId) {
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
exports.MFAService = MFAService;
//# sourceMappingURL=mfaService.js.map