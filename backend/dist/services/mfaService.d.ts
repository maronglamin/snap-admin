export declare class MFAService {
    static generateMFASecret(adminId: string, email: string): Promise<{
        secret: string;
        qrCode: string;
        backupCodes: any[];
    }>;
    static verifyTOTP(token: string, secret: string): boolean;
    static verifyTOTPAlternative(token: string, secret: string): boolean;
    static verifyBackupCode(adminId: string, backupCode: string): Promise<boolean>;
    static generateBackupCodes(count?: number): any[];
    private static generateRandomCode;
    static isMFAEnabled(adminId: string): Promise<boolean>;
    static getMFASecret(adminId: string): Promise<string>;
    static debugMFASetup(adminId: string): Promise<{
        error: string;
        mfaEnabled?: undefined;
        mfaSecret?: undefined;
        mfaVerified?: undefined;
        backupCodesCount?: undefined;
        serverTime?: undefined;
    } | {
        mfaEnabled: boolean;
        mfaSecret: string;
        mfaVerified: boolean;
        backupCodesCount: number;
        serverTime: string;
        error?: undefined;
    }>;
}
//# sourceMappingURL=mfaService.d.ts.map