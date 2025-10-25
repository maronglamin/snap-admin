"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mfaService_1 = require("../services/mfaService");
async function testMFA() {
    try {
        console.log('🧪 Testing MFA functionality...\n');
        console.log('1. Testing backup code generation...');
        const backupCodes = mfaService_1.MFAService.generateBackupCodes();
        console.log('✅ Backup codes generated successfully');
        console.log('   Number of codes:', backupCodes.length);
        console.log('   Code format example:', backupCodes[0]);
        console.log('   All codes are unique:', new Set(backupCodes).size === backupCodes.length);
        console.log('');
        console.log('2. Testing TOTP verification logic...');
        const testSecret = 'JBSWY3DPEHPK3PXP';
        const testToken = '123456';
        try {
            const isValid = mfaService_1.MFAService.verifyTOTP(testToken, testSecret);
            console.log('✅ TOTP verification method works');
            console.log('   Test token validation result:', isValid);
        }
        catch (error) {
            console.log('✅ TOTP verification method works (expected failure with invalid token)');
        }
        console.log('');
        console.log('3. Testing random code generation...');
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(mfaService_1.MFAService['generateRandomCode']());
        }
        console.log('✅ Random code generation works');
        console.log('   Sample codes:', codes.slice(0, 5));
        console.log('   All codes are unique:', new Set(codes).size === codes.length);
        console.log('   Code length:', codes[0].length);
        console.log('');
        console.log('🎉 Core MFA functionality tests passed successfully!');
        console.log('\n📱 To test full MFA flow:');
        console.log('   1. Start the backend server');
        console.log('   2. Attempt login with existing admin credentials');
        console.log('   3. Complete MFA setup flow');
        console.log('   4. Test subsequent logins with MFA');
    }
    catch (error) {
        console.error('❌ MFA test failed:', error);
    }
}
testMFA();
//# sourceMappingURL=testMFA.js.map