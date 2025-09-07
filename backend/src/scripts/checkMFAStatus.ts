import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMFAStatus() {
  try {
    console.log('🔍 Checking MFA Status in Database');
    console.log('==================================');
    console.log('');

    // Get all admin users
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        mfaEnabled: true,
        mfaSecret: true,
        mfaVerified: true,
        mfaBackupCodes: true
      }
    });

    if (admins.length === 0) {
      console.log('❌ No admin users found in database');
      return;
    }

    console.log(`Found ${admins.length} admin user(s):`);
    console.log('');

    admins.forEach((admin, index) => {
      console.log(`👤 Admin ${index + 1}:`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   MFA Enabled: ${admin.mfaEnabled ? '✅ Yes' : '❌ No'}`);
      console.log(`   MFA Verified: ${admin.mfaVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`   MFA Secret: ${admin.mfaSecret ? `✅ ${admin.mfaSecret.substring(0, 8)}...` : '❌ Missing'}`);
      console.log(`   Backup Codes: ${admin.mfaBackupCodes ? `✅ ${admin.mfaBackupCodes.length} codes` : '❌ Missing'}`);
      
      if (admin.mfaBackupCodes && admin.mfaBackupCodes.length > 0) {
        console.log(`   Backup Codes List: [${admin.mfaBackupCodes.join(', ')}]`);
      }
      
      console.log('');
    });

    // Check for specific issues
    console.log('🔍 Analysis:');
    console.log('===========');
    
    const adminsWithSecret = admins.filter(a => a.mfaSecret);
    const adminsWithoutSecret = admins.filter(a => !a.mfaSecret);
    const adminsWithBackupCodes = admins.filter(a => a.mfaBackupCodes && a.mfaBackupCodes.length > 0);
    
    console.log(`✅ Admins with MFA secret: ${adminsWithSecret.length}`);
    console.log(`❌ Admins without MFA secret: ${adminsWithoutSecret.length}`);
    console.log(`✅ Admins with backup codes: ${adminsWithBackupCodes.length}`);
    console.log('');

    if (adminsWithoutSecret.length > 0) {
      console.log('🚨 ISSUE DETECTED: Some admins are missing MFA secrets!');
      console.log('This means TOTP verification will fail.');
      console.log('');
      console.log('Admins missing MFA secret:');
      adminsWithoutSecret.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.username})`);
      });
      console.log('');
      console.log('💡 SOLUTION: These admins need to go through MFA setup again.');
    }

    if (adminsWithSecret.length > 0) {
      console.log('✅ Admins with MFA secret (TOTP should work):');
      adminsWithSecret.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.username})`);
      });
      console.log('');
      console.log('🧪 To test TOTP:');
      console.log('1. Try logging in with these admin credentials');
      console.log('2. Complete MFA setup if prompted');
      console.log('3. Use authenticator app to generate 6-digit codes');
    }

  } catch (error) {
    console.error('❌ Error checking MFA status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkMFAStatus();
