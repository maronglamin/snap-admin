import speakeasy from 'speakeasy';

console.log('🔍 MFA Debug Script');
console.log('===================');
console.log('');

// Test TOTP generation and verification
const testSecret = 'JBSWY3DPEHPK3PXP'; // Test secret for debugging
console.log(`Test Secret: ${testSecret}`);
console.log('');

// Generate current valid tokens
const now = Math.floor(Date.now() / 1000);
const step = 30;

console.log('Current Server Time:', new Date().toISOString());
console.log('Unix Timestamp:', now);
console.log('');

// Generate tokens for different time windows
for (let i = -3; i <= 3; i++) {
  const time = now + (i * step);
  const token = speakeasy.totp({
    secret: testSecret,
    encoding: 'base32',
    time,
    step,
    algorithm: 'sha1'
  });
  
  const timeLabel = i === 0 ? 'CURRENT' : i > 0 ? `+${i * step}s` : `${i * step}s`;
  console.log(`${timeLabel.padEnd(10)} | ${token} | ${new Date(time * 1000).toISOString()}`);
}

console.log('');
console.log('🔧 Troubleshooting Tips:');
console.log('1. Ensure your authenticator app is generating 6-digit codes');
console.log('2. Enter the code within 30 seconds of generation');
console.log('3. Check if your device time is synchronized');
console.log('4. Try using the CURRENT token from above');
console.log('5. If using Authy, ensure it\'s set to TOTP mode');
console.log('');
console.log('📱 Test with a real authenticator app:');
console.log(`- Secret: ${testSecret}`);
console.log('- Issuer: SNAP Marketplace');
console.log('- Account: test@example.com');
console.log('- Algorithm: SHA1');
console.log('- Digits: 6');
console.log('- Period: 30 seconds');
