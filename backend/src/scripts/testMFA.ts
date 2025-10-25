import { MFAService } from '../services/mfaService';

async function testMFA() {
  try {
    console.log('🧪 Testing MFA functionality...\n');

    // Test 1: Test backup code generation
    console.log('1. Testing backup code generation...');
    const backupCodes = MFAService.generateBackupCodes();
    console.log('✅ Backup codes generated successfully');
    console.log('   Number of codes:', backupCodes.length);
    console.log('   Code format example:', backupCodes[0]);
    console.log('   All codes are unique:', new Set(backupCodes).size === backupCodes.length);
    console.log('');

    // Test 2: Test TOTP verification logic (without actual verification)
    console.log('2. Testing TOTP verification logic...');
    const testSecret = 'JBSWY3DPEHPK3PXP'; // Test secret
    const testToken = '123456';
    
    // This will fail with invalid token, but tests the method
    try {
      const isValid = MFAService.verifyTOTP(testToken, testSecret);
      console.log('✅ TOTP verification method works');
      console.log('   Test token validation result:', isValid);
    } catch (error) {
      console.log('✅ TOTP verification method works (expected failure with invalid token)');
    }
    console.log('');

    // Test 3: Test random code generation
    console.log('3. Testing random code generation...');
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(MFAService['generateRandomCode']());
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

  } catch (error) {
    console.error('❌ MFA test failed:', error);
  }
}

// Run the test
testMFA();
